"""Автоматический демонстрационный тур по прототипу «Колбасный цех».

Браузер (Playwright) последовательно открывает экраны, подсвечивает элементы,
показывает подписи и озвучивает сцены через Yandex SpeechKit. По завершении
сохраняются скриншоты и видео всего прохода.

Примеры запуска:
    python demo/tour.py                       # озвучка + видео, браузер виден
    python demo/tour.py --headless            # без окна (для проверки/CI)
    python demo/tour.py --no-tts              # только подписи и паузы
    python demo/tour.py --only intro,gourmet  # отдельные сцены
    python demo/tour.py --base-url http://localhost:5010

Учётные данные Yandex TTS — в переменных окружения (см. demo/tts.py).
"""

from __future__ import annotations

import argparse
import base64
import re
import shutil
import sys
import time
from pathlib import Path

import httpx
from playwright.sync_api import Page, TimeoutError as PlaywrightTimeoutError, sync_playwright

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from scenario import ACCOUNTS, SCENES  # noqa: E402
from tts import YandexTTS  # noqa: E402

OUT = ROOT / "out"
SCREENS = OUT / "screens"
AUDIO = OUT / "audio"
VIDEO = OUT / "video"

OVERLAY_CSS = """
.__tour_hl {
  outline: 4px solid #eabf4b !important;
  outline-offset: 3px !important;
  border-radius: 14px !important;
  box-shadow: 0 0 0 9999px rgba(20, 8, 6, 0.35), 0 0 32px rgba(234, 191, 75, 0.9) !important;
  position: relative !important;
  z-index: 99998 !important;
  transition: outline-color 0.3s ease, box-shadow 0.3s ease !important;
}
#__tour_caption {
  position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%);
  max-width: min(920px, 92vw); padding: 18px 26px; z-index: 99999;
  background: rgba(20, 8, 6, 0.92); color: #fbf6ee; border-radius: 20px;
  border: 1px solid rgba(234, 191, 75, 0.6);
  box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.85);
  font-family: Inter, system-ui, sans-serif; line-height: 1.45;
}
#__tour_caption .__t { color: #eabf4b; font-weight: 700; font-size: 15px; letter-spacing: 0.04em; text-transform: uppercase; }
#__tour_caption .__d { margin-top: 6px; font-size: 18px; }
#__tour_badge {
  position: fixed; top: 14px; right: 20px;
  z-index: 99999; padding: 8px 18px; border-radius: 999px;
  background: rgba(20, 8, 6, 0.9); color: #eabf4b; font-weight: 700;
  font-family: Inter, system-ui, sans-serif; font-size: 13px;
  border: 1px solid rgba(234, 191, 75, 0.5);
}
"""

CAPTION_JS = """
([title, text]) => {
  let el = document.getElementById('__tour_caption');
  if (!el) {
    el = document.createElement('div');
    el.id = '__tour_caption';
    el.innerHTML = '<div class="__t"></div><div class="__d"></div>';
    document.body.appendChild(el);
  }
  el.querySelector('.__t').textContent = title;
  el.querySelector('.__d').textContent = text;
}
"""

BADGE_JS = """
(step) => {
  let el = document.getElementById('__tour_badge');
  if (!el) {
    el = document.createElement('div');
    el.id = '__tour_badge';
    document.body.appendChild(el);
  }
  el.textContent = step;
}
"""

PLAY_AUDIO_JS = """
async ([src, ms]) => {
  try { window.__tourAudio && window.__tourAudio.pause(); } catch (e) {}
  await new Promise((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    let audio;
    try {
      audio = new Audio('data:audio/mpeg;base64,' + src);
    } catch (e) { setTimeout(finish, ms); return; }
    window.__tourAudio = audio;
    audio.addEventListener('ended', finish);
    audio.addEventListener('error', () => setTimeout(finish, ms));
    audio.play().then(() => {}).catch(() => setTimeout(finish, ms));
    setTimeout(finish, ms + 2000);
  });
  return true;
}
"""


def log(message: str) -> None:
    print(f"[тур] {message}", flush=True)


def fetch_token(base_url: str, role: str) -> str:
    email, password = ACCOUNTS[role]
    response = httpx.post(
        f"{base_url}/api/auth/login", json={"email": email, "password": password}, timeout=20
    )
    response.raise_for_status()
    return response.json()["access_token"]


def apply_role(page: Page, base_url: str, token: str) -> None:
    page.goto(base_url, wait_until="domcontentloaded")
    page.evaluate("(t) => localStorage.setItem('kolbaska_token', t)", token)


def run_action(page: Page, action: dict) -> None:
    try:
        if "click" in action:
            page.locator(action["click"]).first.click(timeout=5000)
        elif "hover" in action:
            page.locator(action["hover"]).first.hover(timeout=5000)
        elif "fill" in action:
            selector, value = action["fill"]
            page.locator(selector).first.fill(value, timeout=5000)
        elif "select" in action:
            selector, value = action["select"]
            page.locator(selector).first.select_option(value, timeout=5000)
        elif "press" in action:
            selector, key = action["press"]
            page.locator(selector).first.press(key, timeout=5000)
        elif "wait" in action:
            page.wait_for_timeout(int(action["wait"]))
    except PlaywrightTimeoutError:
        log(f"  действие пропущено (не найдено): {action}")


def highlight(page: Page, selector: str | None) -> None:
    page.evaluate("() => document.querySelectorAll('.__tour_hl').forEach(e => e.classList.remove('__tour_hl'))")
    if not selector:
        return
    try:
        locator = page.locator(selector).first
        locator.scroll_into_view_if_needed(timeout=4000)
        locator.evaluate("el => el.classList.add('__tour_hl')")
    except PlaywrightTimeoutError:
        log(f"  элемент для подсветки не найден: {selector}")


def narrate(page: Page, tts: YandexTTS, text: str, use_tts: bool) -> None:
    seconds = tts.estimate_seconds(text)
    audio_path = tts.synthesize(text) if use_tts else None
    if audio_path is None:
        page.wait_for_timeout(int(seconds * 1000))
        return
    data = base64.b64encode(audio_path.read_bytes()).decode()
    page.evaluate(PLAY_AUDIO_JS, [data, int(seconds * 1000)])


def slugify(value: str) -> str:
    value = re.sub(r"[^\w\s-]", "", value, flags=re.UNICODE).strip().lower()
    return re.sub(r"[\s_]+", "-", value)[:60] or "scene"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Демонстрационный тур по прототипу")
    parser.add_argument("--base-url", default="http://localhost:5010")
    parser.add_argument("--headless", action="store_true", help="без окна браузера")
    parser.add_argument("--no-tts", action="store_true", help="не использовать Yandex TTS")
    parser.add_argument("--no-video", action="store_true", help="не записывать видео")
    parser.add_argument("--only", default="", help="список id сцен через запятую")
    parser.add_argument("--slowmo", type=int, default=0, help="замедление действий, мс")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    only = {item.strip() for item in args.only.split(",") if item.strip()}
    scenes = [s for s in SCENES if not only or s["id"] in only]
    if not scenes:
        log("Нет сцен для показа.")
        return

    tts = YandexTTS(AUDIO)
    use_tts = not args.no_tts and tts.enabled
    if SCREENS.exists():
        shutil.rmtree(SCREENS)
    for directory in (SCREENS, AUDIO, VIDEO):
        directory.mkdir(parents=True, exist_ok=True)
    if not args.no_tts and not tts.enabled:
        log("Yandex TTS не настроен (нет YANDEX_TTS_API_KEY/IAM) — работаем без озвучки.")

    tokens: dict[str, str] = {}
    video_path: Path | None = None

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=args.headless,
            slow_mo=args.slowmo,
            args=["--autoplay-policy=no-user-gesture-required", "--start-maximized"],
        )
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            record_video_dir=None if args.no_video else str(VIDEO),
            record_video_size={"width": 1440, "height": 900},
        )
        page = context.new_page()

        for index, item in enumerate(scenes, start=1):
            title = item["title"]
            log(f"{index}/{len(scenes)} — {title}")

            role = item.get("role")
            if role:
                if role not in tokens:
                    tokens[role] = fetch_token(args.base_url, role)
                apply_role(page, args.base_url, tokens[role])

            target = item.get("url")
            if target:
                page.goto(f"{args.base_url}{target}", wait_until="domcontentloaded")
            page.wait_for_timeout(600)

            page.add_style_tag(content=OVERLAY_CSS)
            page.evaluate(BADGE_JS, f"{index} / {len(scenes)}")
            for action in item.get("actions", []):
                run_action(page, action)
            page.wait_for_timeout(300)

            highlight(page, item.get("selector"))
            page.evaluate(CAPTION_JS, [title, item["narration"]])
            page.wait_for_timeout(500)

            narrate(page, tts, item["narration"], use_tts)
            page.wait_for_timeout(400)
            page.screenshot(path=str(SCREENS / f"{index:02d}-{slugify(title)}.png"))

        context.close()
        if not args.no_video and page.video:
            raw_video = page.video.path()
            if raw_video and Path(raw_video).exists():
                video_path = VIDEO / "kolbaska-tour.webm"
                shutil.move(raw_video, video_path)
        browser.close()

    log(f"Скриншоты: {SCREENS}")
    if video_path is not None:
        log(f"Видео: {video_path}")


if __name__ == "__main__":
    main()
