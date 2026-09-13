"""Сборка озвученного видео из скриншотов сцен и mp3 от Yandex TTS.

Playwright записывает видео без звука, поэтому для заказчика собирается отдельный
ролик: каждый скриншот сцены показывается ровно столько, сколько звучит её озвучка.

Требуется ffmpeg/ffprobe в PATH.

    python demo/narrate.py
    python demo/narrate.py --gap 0.9 --output demo/out/video/kolbaska-tour-narrated.mp4
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from scenario import SCENES  # noqa: E402
from tts import YandexTTS  # noqa: E402

OUT = ROOT / "out"
SCREENS = OUT / "screens"
AUDIO = OUT / "audio"
VIDEO = OUT / "video"


def run(args: list[str]) -> None:
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        if result.stderr:
            print("\n".join(result.stderr.strip().splitlines()[-15:]))
        raise SystemExit(f"Команда завершилась с ошибкой (код {result.returncode}): {args[0]}")


def duration_of(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=True, capture_output=True, text=True,
    )
    return float(result.stdout.strip())


def find_screenshots() -> list[Path]:
    if not SCREENS.is_dir():
        return []
    return sorted(path for path in SCREENS.glob("*.png"))


def build(
    output: Path,
    gap: float,
    use_tts: bool,
    music: Path | None = None,
    music_volume: float = 0.12,
    duck: bool = False,
) -> Path:
    screens = find_screenshots()
    if not screens:
        raise SystemExit(f"Нет скриншотов в {SCREENS}. Сначала запустите demo/tour.py.")

    tts = YandexTTS(AUDIO)
    scene_audio: list[Path | None] = []
    for index, scene in enumerate(SCENES[: len(screens)]):
        audio: Path | None = None
        if use_tts and tts.enabled:
            try:
                audio = tts.synthesize(scene["narration"])
            except Exception as exc:  # noqa: BLE001
                print(f"  ! сцена {index + 1:02d}: озвучка не удалась ({exc}); пока пропустим")
        scene_audio.append(audio)
        state = f"{audio.name}" if audio else "без озвучки (тишина)"
        print(f"  {index + 1:02d}. {scene['title']} — {state}")

    work = OUT / "narrate"
    work.mkdir(parents=True, exist_ok=True)
    silence = work / "silence.mp3"
    run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono",
        "-t", f"{gap:.2f}", "-c:a", "libmp3lame", "-b:a", "64k", str(silence),
    ])

    image_list = work / "images.txt"
    audio_list = work / "audio.txt"
    image_lines: list[str] = []
    audio_lines: list[str] = []
    total = 0.0

    for index, (screen, audio) in enumerate(zip(screens, scene_audio)):
        if audio is not None:
            base = duration_of(audio)
            audio_lines.append(f"file '{audio.resolve()}'")
        else:
            base = tts.estimate_seconds(SCENES[index]["narration"])
        length = base + gap
        total += length
        image_lines.append(f"file '{screen.resolve()}'")
        image_lines.append(f"duration {length:.3f}")
        audio_lines.append(f"file '{silence.resolve()}'")

    # concat требует повторить последний кадр без duration
    image_lines.append(f"file '{screens[-1].resolve()}'")
    image_list.write_text("\n".join(image_lines), encoding="utf-8")
    audio_list.write_text("\n".join(audio_lines), encoding="utf-8")

    output.parent.mkdir(parents=True, exist_ok=True)
    base_cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", str(image_list),
        "-f", "concat", "-safe", "0", "-i", str(audio_list),
    ]
    encode = [
        "-c:v", "libx264", "-preset", "medium", "-crf", "22",
        "-pix_fmt", "yuv420p", "-r", "30",
        "-c:a", "aac", "-b:a", "128k",
        "-shortest", str(output),
    ]

    if music is not None:
        if not music.is_file():
            raise SystemExit(f"Файл музыки не найден: {music}")
        fade_start = max(total - 3.0, 0.0)
        fmt = "aformat=sample_rates=48000:channel_layouts=stereo"
        if duck:
            # Музыка автоматически приглушается, когда звучит голос (sidechain — голос).
            filters = (
                f"[1:a]{fmt},asplit=2[nar1][nar2];"
                f"[2:a]{fmt},volume={music_volume}[mus];"
                "[mus][nar1]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=500[musd];"
                f"[nar2][musd]amix=inputs=2:duration=first:normalize=0,"
                f"afade=t=out:st={fade_start:.2f}:d=3[a]"
            )
        else:
            filters = (
                f"[1:a]{fmt}[nar];"
                f"[2:a]{fmt},volume={music_volume}[mus];"
                f"[nar][mus]amix=inputs=2:duration=first:normalize=0,"
                f"afade=t=out:st={fade_start:.2f}:d=3[a]"
            )
        run([
            *base_cmd,
            "-stream_loop", "-1", "-i", str(music),
            "-filter_complex", filters,
            "-map", "0:v", "-map", "[a]",
            *encode,
        ])
        print(f"\nГотово: {output} (≈{total:.0f} с, музыка: {music.name}, громкость {music_volume})")
    else:
        run([*base_cmd, *encode])
        print(f"\nГотово: {output} (≈{total:.0f} с)")
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description="Озвученное видео из скриншотов тура")
    parser.add_argument("--output", type=Path, default=VIDEO / "kolbaska-tour-narrated.mp4")
    parser.add_argument("--gap", type=float, default=0.8, help="пауза между сценами, с")
    parser.add_argument("--no-tts", action="store_true", help="без озвучки (тишина)")
    parser.add_argument("--music", type=Path, default=None, help="фоновый аудиофайл (mp3/wav/m4a)")
    parser.add_argument("--music-volume", type=float, default=0.12, help="громкость музыки (0..1)")
    parser.add_argument("--duck", action="store_true", help="приглушать музыку под голос")
    args = parser.parse_args()

    print("Сборка озвученного видео:")
    build(
        args.output,
        args.gap,
        use_tts=not args.no_tts,
        music=args.music,
        music_volume=args.music_volume,
        duck=args.duck,
    )


if __name__ == "__main__":
    main()
