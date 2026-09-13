"""Yandex SpeechKit TTS (v3, REST): синтез речи с кэшированием.

Работает через `POST https://tts.api.cloud.yandex.net/tts/v3/utteranceSynthesis`
(старый REST v1 отдаёт 415 application/grpc).

Учётные данные берутся из переменных окружения или из demo/.env:
    YANDEX_TTS_API_KEY   — API-ключ сервисного аккаунта (предпочтительно)
    YANDEX_TTS_IAM_TOKEN — либо IAM-токен (если ключа нет)
    YANDEX_TTS_FOLDER_ID — идентификатор каталога (обычно не требуется для API-ключа)
    YANDEX_TTS_VOICE     — голос, по умолчанию filipp (мужской, уверенный)
    YANDEX_TTS_ROLE      — характер голоса, если поддерживается (например, good)
    YANDEX_TTS_SPEED     — скорость, по умолчанию 1.0

Готовые mp3 кладутся в каталог кэша, поэтому повторные запуски бесплатны и быстрые.
"""

from __future__ import annotations

import base64
import hashlib
import os
import time
from pathlib import Path

import httpx

TTS_URL = "https://tts.api.cloud.yandex.net/tts/v3/utteranceSynthesis"
ENV_FILE = Path(__file__).resolve().parent / ".env"


def load_env_file(path: Path = ENV_FILE) -> None:
    """Читает demo/.env (KEY=VALUE), не переопределяя уже заданные переменные окружения."""
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


class YandexTTS:
    def __init__(self, cache_dir: Path) -> None:
        load_env_file()
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.api_key = os.getenv("YANDEX_TTS_API_KEY", "").strip()
        self.iam_token = os.getenv("YANDEX_TTS_IAM_TOKEN", "").strip()
        self.folder_id = os.getenv("YANDEX_TTS_FOLDER_ID", "").strip()
        self.voice = os.getenv("YANDEX_TTS_VOICE", "filipp").strip() or "filipp"
        self.role = os.getenv("YANDEX_TTS_ROLE", "").strip()
        self.speed = float(os.getenv("YANDEX_TTS_SPEED", "1.0") or "1.0")
        self.retries = int(os.getenv("YANDEX_TTS_RETRIES", "4") or "4")

    @property
    def enabled(self) -> bool:
        return bool(self.api_key or self.iam_token)

    def _cache_path(self, text: str) -> Path:
        key = hashlib.sha256(
            f"{self.voice}|{self.role}|{self.speed}|{text}".encode()
        ).hexdigest()[:24]
        return self.cache_dir / f"{key}.mp3"

    def synthesize(self, text: str) -> Path | None:
        """Возвращает путь к mp3 с озвучкой или None, если TTS не настроен."""
        if not self.enabled or not text.strip():
            return None
        target = self._cache_path(text)
        if target.exists() and target.stat().st_size > 0:
            return target

        headers = {"Content-Type": "application/json"}
        headers["Authorization"] = (
            f"Api-Key {self.api_key}" if self.api_key else f"Bearer {self.iam_token}"
        )
        voice_hint: dict[str, object] = {"voice": self.voice}
        if self.role:
            voice_hint["role"] = self.role
        payload: dict[str, object] = {
            "text": text,
            "hints": [voice_hint, {"speed": self.speed}, {"volume": 1.0}],
            "outputAudioSpec": {"containerAudio": {"containerAudioType": "MP3"}},
        }
        if self.folder_id:
            payload["folderId"] = self.folder_id

        response = None
        last_error: Exception | None = None
        for attempt in range(1, self.retries + 1):
            try:
                response = httpx.post(TTS_URL, headers=headers, json=payload, timeout=90)
                response.raise_for_status()
                break
            except (httpx.HTTPError, OSError) as exc:
                last_error = exc
                if attempt < self.retries:
                    time.sleep(1.5 * attempt)
        if response is None or response.status_code != 200:
            raise RuntimeError(f"TTS недоступен после {self.retries} попыток: {last_error}")
        result = response.json().get("result") or {}
        audio_b64 = (result.get("audioChunk") or {}).get("data")
        if not audio_b64:
            raise RuntimeError(f"TTS: неожиданный ответ, ключи: {list(result.keys())}")
        target.write_bytes(base64.b64decode(audio_b64))
        return target

    @staticmethod
    def estimate_seconds(text: str) -> float:
        """Оценка длительности речи, если аудио недоступно: ~14 символов в секунду."""
        return max(2.5, len(text) / 14.0 + 1.0)
