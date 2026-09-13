# Процессы и последовательности

Артефакт системного аналитика: контекстная диаграмма, бизнес-процесс оформления заказа,
диаграммы последовательности ключевых операций и жизненный цикл заказа.

Связанные артефакты: `docs/analysis/use-cases.md`, `docs/analysis/requirements.md`,
`docs/specification.md` (ER-диаграмма и API).

## 1. Контекстная диаграмма (C4, уровень 1)

```mermaid
flowchart LR
    client(["Клиент"])
    tech(["Технолог<br/>производства"])
    analyst(["Бизнес-аналитик"])
    admin(["Администратор<br/>сервиса"])

    subgraph SYS["Прототип «Колбасный цех»<br/>(SPA + FastAPI + SQLite)"]
        web["Веб-интерфейс (React SPA)"]
        api["API (FastAPI)"]
        db[("SQLite<br/>kolbaska.db")]
        web --> api
        api --> db
    end

    osm["OpenStreetMap / Leaflet<br/>тайлы карты"]
    pay["Платёжный провайдер<br/>(эмуляция)"]
    tts["Yandex SpeechKit<br/>(только демо-тур)"]

    client --> web
    tech --> web
    analyst --> web
    admin --> web
    web -. "тайлы" .-> osm
    web -. "демо-оплата" .-> pay
    tts -. "озвучка тура" .-> web
```

## 2. Бизнес-процесс «Оформление и оплата заказа»

```mermaid
flowchart TD
    start([Начало]) --> browse["Клиент выбирает товар<br/>или собирает рецепт"]
    browse --> add["Добавляет позицию в корзину"]
    add --> has{"Корзина<br/>не пуста?"}
    has -- нет --> browse
    has -- да --> checkout["Нажимает «Перейти к оплате»"]

    subgraph BACK["Backend: расчёт и создание заказа"]
        discount["Определить скидки акций<br/>и скидку уровня"]
        total["Рассчитать сумму в валюте<br/>и будущие баллы"]
        create["Создать заказ (new)<br/>+ история статусов"]
        clear["Очистить корзину"]
        discount --> total --> create --> clear
    end

    checkout --> discount
    clear --> paypage["Платёжная страница (демо)"]
    paypage --> pay{"Клиент нажал<br/>«Оплатить (демо)»?"}
    pay -- нет --> paypage
    pay -- да --> paid["Статус: Подтверждён<br/>paid = true"]
    paid --> points["Начислить баллы<br/>и пересчитать уровень"]
    points --> notify["Показать успех<br/>и вернуть в кабинет"]
    notify --> stop([Конец])
```

## 3. Последовательность: расчёт цены изделия по рецепту

```mermaid
sequenceDiagram
    autonumber
    participant C as Клиент SPA
    participant A as API
    participant DB as SQLite

    C->>A: GET /api/gourmet/groups
    A->>DB: SELECT группы и опции
    DB-->>A: группы, подсказки, price_delta
    A-->>C: справочники конструктора
    C->>C: клиент меняет выбор
    C->>A: POST /api/gourmet/price {выбор}
    A->>DB: SELECT выбранные опции
    DB-->>A: price_delta
    A->>A: BASE_PRICE + сумма надбавок
    A-->>C: итог и расшифровка строк
    C->>C: обновить цену и предпросмотр
```

## 4. Последовательность: оформление и демо-оплата

```mermaid
sequenceDiagram
    autonumber
    participant C as Клиент SPA
    participant A as API
    participant DB as SQLite

    C->>A: POST /api/orders/checkout
    A->>DB: SELECT cart_items
    DB-->>A: позиции корзины
    A->>DB: SELECT promos, loyalty_levels
    DB-->>A: акции и уровень
    A->>A: рассчитать скидки, сумму, баллы
    A->>DB: INSERT order, order_items, history
    A->>DB: DELETE cart_items
    A-->>C: заказ (new, суммы, баллы)

    C->>A: POST /api/orders/{id}/pay
    A->>DB: SELECT order (проверка владельца)
    A->>DB: UPDATE order (paid, confirmed), history
    A->>DB: UPDATE client_profiles (баллы, уровень)
    A-->>C: заказ (Подтверждён, баллы начислены)
```

## 5. Последовательность: выгрузка заказа технологом

```mermaid
sequenceDiagram
    autonumber
    participant T as Технолог SPA
    participant A as API
    participant DB as SQLite

    T->>A: PATCH /api/orders/{id}/status {in_production}
    A->>DB: UPDATE order + INSERT history
    A-->>T: заказ с новым статусом
    T->>A: GET /api/orders/{id}/export?format=md
    A->>DB: SELECT order, order_items
    DB-->>A: данные заказа
    A-->>T: файл Markdown (attachment)
```

## 6. Жизненный цикл заказа

```mermaid
stateDiagram-v2
    [*] --> new : checkout
    new --> confirmed : демо-оплата
    new --> cancelled : отмена
    confirmed --> in_production : отправка в цех
    in_production --> packing : производство завершено
    packing --> ready : упаковано
    ready --> shipped : передано в доставку
    shipped --> done : получено клиентом
    confirmed --> cancelled : отмена
    in_production --> cancelled : отмена
    done --> [*]
    cancelled --> [*]
```

> В прототипе переходы выполняются вручную технологом/администратором; автоматических триггеров и
> интеграции с производством нет.
