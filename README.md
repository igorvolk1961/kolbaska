# Колбасный цех — прототип интернет-магазина

Продающий прототип пользовательского интерфейса ПО для заказного производства мясокомбината:
«колбасные торты» из готовой продукции и изделия малыми объёмами по рецепту клиента.

Прототип демонстрирует интерфейсы всех операций, но **не выполняет реальные платежи и транзакции,
не отправляет заказы в производство автоматически и не отслеживает доставку** — соответствующие
экраны и статусы эмулируются.

## Возможности по ролям

- **Клиент** — главная с валютой и акциями, каталог «Мясная лавка» и «Арт-объекты», пошаговый
  конструктор своего рецепта, корзина, демо-оплата, личный кабинет, баллы и уровни лояльности,
  ИИ-ассистент «Роберт ИИчкин».
- **Технолог производства** — справочники выбора и цены, список заказов, печать, выгрузка в
  Markdown и JSON, отправка в производство (смена статуса), отслеживание статусов.
- **Бизнес-аналитик** — дашборды (ассортимент, выручка, сезонность, дни недели, эффект акций),
  управление временными акциями и множителями баллов.
- **Администратор сервиса** — пользователи и роли (Технолог, Аналитик, Администратор), контроль
  аккаунтов клиентов, корректировка баллов.

## Стек

- Backend: Python 3.12, FastAPI, SQLAlchemy 2, SQLite, JWT (PyJWT)
- Frontend: React 18 + TypeScript + Vite, Tailwind CSS, Recharts, React Router
- В Docker backend раздаёт собранный SPA одним сервисом (`uvicorn`, порт 8000)

## Быстрый запуск в Docker

```bash
docker compose -f docker-compose.yml up -d --build
```

Приложение: http://localhost:5010 (SPA), API и Swagger: http://localhost:5010/docs.

SPA — единый контейнер: FastAPI отдаёт и `/api/*`, и собранный фронтенд. База лежит в томе
`kolbaska-data` (`/data/kolbaska.db`) и сохраняется между перезапусками.

Остановить:

```bash
docker compose -f docker-compose.yml down
```

Полная очистка вместе с данными:

```bash
docker compose -f docker-compose.yml down -v
```

> Сборка образа требует доступа в интернет (npm/pip). Если у Docker-демона нет DNS, используйте
> `build.network: host` — он уже включён в `docker-compose.yml`.

## Локальная разработка

Backend:

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend (проксирует `/api` на `127.0.0.1:8000`):

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

## Демо-доступы

См. `docs/demo-accounts.md`. Кратко: `client@kolbaska.ru / client123`,
`technolog@kolbaska.ru / techno123`, `analyst@kolbaska.ru / analyst123`,
`admin@kolbaska.ru / admin123`.

## Контент

- 32 изделия (16 «Мясная лавка» + 16 «Арт-объекты») с составом, весом, габаритами, ценой и сроком —
  `backend/app/content/catalog.py`.
- Промпты генерации изображений — `docs/product-prompts.md`
  (генерируется `python backend/scripts/export_prompts.py`).
- Справочники конструктора, уровни лояльности и курсы валют — `backend/app/content/gourmet.py`.

## Основные API

| Метод | Путь | Назначение |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | регистрация и вход |
| GET | `/api/auth/me`, `/api/auth/levels` | профиль, уровень, уровни лояльности |
| GET | `/api/catalog/products` | каталог (`section`, `category`, `search`) |
| GET | `/api/gourmet/groups` | справочники конструктора с подсказками |
| POST | `/api/gourmet/price` | расчёт цены конфигурации |
| GET/POST | `/api/cart`, `/api/cart/items` | корзина |
| POST | `/api/orders/checkout`, `/api/orders/{id}/pay` | оформление и демо-оплата |
| PATCH | `/api/orders/{id}/status` | смена статуса (технолог/админ) |
| GET | `/api/orders/{id}/export?format=md\|json` | выгрузка заказа |
| GET | `/api/promos/public` | активные акции |
| GET | `/api/analytics/overview` | метрики (аналитик/админ) |
| GET/POST | `/api/admin/users`, `/api/admin/clients` | пользователи и клиенты |
| POST | `/api/assistant/chat` | скриптовый ИИ-ассистент |

## Тесты и проверки

```bash
cd backend && .venv/bin/python -m pytest -q          # 19 тестов API
cd frontend && npm run build                          # tsc --noEmit + vite build
cd frontend && npm run lint                           # eslint
```

## Структура

```
backend/app/          FastAPI-приложение (models, schemas, security, services, routers, content, seed)
backend/scripts/      экспорт документации по промптам
backend/tests/        pytest
frontend/src/         React SPA (api, auth, settings, components, pages)
docs/                 ТЗ, промпты, демо-доступы
Dockerfile            многоступенчатая сборка (node build → python runtime)
docker-compose.yml    сервис + том данных
```
