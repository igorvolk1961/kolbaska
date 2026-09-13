# Демонстрационный тур по прототипу

Скрипт автоматически проходит по всем экранам прототипа: открывает страницы в реальном браузере,
подсвечивает элементы, показывает подписи и озвучивает сцены через **Yandex SpeechKit (TTS)**.
На выходе — скриншоты и видео всего прохода, которые можно отправить заказчику.

## Установка

```bash
python3 -m venv demo/.venv
demo/.venv/bin/pip install -r demo/requirements.txt
demo/.venv/bin/playwright install chromium
```

## Учётные данные Yandex TTS

Нужен сервисный аккаунт с ролью `ai.speechkit-tts.user` и API-ключ. Удобнее всего положить ключи в
файл `demo/.env` (он в `.gitignore` и не попадёт в репозиторий):

```
YANDEX_TTS_API_KEY=<API-ключ>
YANDEX_TTS_FOLDER_ID=<идентификатор каталога>
YANDEX_TTS_VOICE=filipp
YANDEX_TTS_SPEED=1.0
```

Либо задать те же значения переменными окружения:

```bash
export YANDEX_TTS_API_KEY="<API-ключ>"
export YANDEX_TTS_FOLDER_ID="<идентификатор каталога>"
```

Вместо API-ключа можно указать `YANDEX_TTS_IAM_TOKEN`. Синтез идёт через REST v3
(`/tts/v3/utteranceSynthesis`); старый REST v1 отвечает `415 application/grpc` и не используется.

**Голос.** По умолчанию `filipp` — мужской, спокойный и уверенный: ближе всего к «брутальному»
для рассказа заказчику. Другие мужские голоса: `zahar` (мягче), `madirus`, `ermil` (нейтральный).
Женские: `alena`, `jane`, `omazh`, `dasha`. Для отдельных голосов доступен характер —
`YANDEX_TTS_ROLE` (например, `good`). Если ключи не заданы, тур работает без озвучки.

## Запуск

Приложение должно быть запущено (например, `docker compose -f docker-compose.yml up -d`,
http://localhost:5010).

```bash
demo/.venv/bin/python demo/tour.py                     # браузер виден, озвучка + видео
demo/.venv/bin/python demo/tour.py --headless          # без окна (проверка)
demo/.venv/bin/python demo/tour.py --no-tts            # без озвучки
demo/.venv/bin/python demo/tour.py --only intro,gourmet
demo/.venv/bin/python demo/tour.py --base-url http://localhost:5010 --slowmo 300
```

## Озвученное видео для заказчика

Видео Playwright записывается **без звука**. Чтобы получить ролик с озвучкой, после тура собирается
отдельное видео: каждый скриншот сцены показывается ровно столько, сколько звучит её mp3.

```bash
demo/.venv/bin/python demo/narrate.py
```

Требуется `ffmpeg`/`ffprobe` в `PATH`. Результат — `demo/out/video/kolbaska-tour-narrated.mp4`
(H.264 + AAC). Аудио кэшируется, повторная сборка бесплатна. Если сеть к Yandex подвела,
недостающие сцены озвучиваются тишиной — просто запустите `narrate.py` ещё раз.

## Результаты

```
demo/out/screens/NN-<сцена>.png              # скриншот каждой сцены
demo/out/audio/<hash>.mp3                    # кэш озвучки (повторные запуски не тратят квоту)
demo/out/video/kolbaska-tour.webm            # видео всего прохода (без звука)
demo/out/video/kolbaska-tour-narrated.mp4    # озвученный ролик для заказчика
```

## Как добавить или изменить сцену

Сценарии — в `demo/scenario.py`. Сцена описывает адрес, роль (для входа под нужным аккаунтом),
селектор для подсветки, действия (клик, наведение, ввод, выбор, ожидание) и текст для озвучки:

```python
scene(
    id="cart",
    title="Корзина",
    role="client",
    url="/cart",
    selector="h1",
    actions=[{"click": "button:has-text('Перейти к оплате')"}],
    narration="Здесь клиент проверяет состав корзины и переходит к оплате.",
)
```

Селекторы — стандартные селекторы Playwright (`css=` или `text=`), поэтому сцену можно нацелить
на любой элемент интерфейса.
