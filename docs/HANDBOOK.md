# Bahandi / Qamqor — Полный справочник проекта

Система автоматизации и контроля списаний на торговых точках (фастфуд).
Монорепо: `backend` (Python/Litestar), `frontend` (React/Vite), `mobile` (Flutter), оркестрация — `docker-compose.yml`.

---

## 1. Что это за продукт

Сотрудник точки фотографирует продукт под списание → отправляет заявку → проверяющий (менеджер) одобряет/отклоняет → при одобрении создаётся **акт списания в iiko** и списываются остатки на складе. Владелец видит аналитику, KPI и управляет справочниками.

Роли: **sender** (сотрудник), **reviewer** (менеджер/проверяющий), **owner** (владелец/админ).

---

## 2. Архитектура

```
HackathonProj/
├─ backend/      Litestar API (Python 3.12), SQLAlchemy(async), Alembic, S3, OpenAI, iiko
├─ frontend/     React 19 + Vite + TanStack Query + Tailwind v4 (FSD-структура)
├─ mobile/       Flutter (собирается как web в Docker; на телефоне — нативно)
├─ docker-compose.yml   postgres + minio(+createbuckets) + backend + frontend + mobile
├─ docs/         API_CONTRACT.md, HANDBOOK.md, планы/спеки
└─ .env(.example)
```

Сервисы в compose:
| Сервис | Что | Порт (host) |
|---|---|---|
| postgres | БД | `${POSTGRES_PORT:-5432}` |
| minio | S3-хранилище фото | 9000 (api) / 9001 (консоль) |
| createbuckets | one-shot: создаёт бакет `bahandi-photos` | — |
| backend | Litestar API | 4000 |
| frontend | React (Vite dev server) | 5173 |
| mobile | Flutter web (nginx) | 8080 |

> На этой машине в `.env` порты переопределены, чтобы не конфликтовать: `POSTGRES_PORT=5544`, `MINIO_PORT=9100`, `MINIO_CONSOLE_PORT=9101`.

---

## 3. Технологии и почему

- **Litestar** (а не FastAPI) — современный async-фреймворк, DI, guards, msgspec.
- **SQLAlchemy 2 (async)** + **Alembic** — реальные миграции, не `create_all`.
- **PostgreSQL** (прод/compose), **SQLite** (тесты, через aiosqlite).
- **S3/MinIO** — хранение фото; в коде один адаптер `PhotoStorage`, локально MinIO, в проде — реальный S3.
- **OpenAI Vision** (`gpt-5.4-nano`) — анализ фото; запасной путь Anthropic, затем rule-based.
- **JWT (HS256)** — авторизация; гварды по ролям.
- **React 19 + Vite + TanStack Query v5** — серверное состояние через хуки/кэш.
- **Tailwind v4** (`@tailwindcss/vite` + `@config`).
- **Flutter** — мобильное приложение; в Docker собирается как web и отдаётся nginx.

---

## 4. Что ЕСТЬ (по слоям)

### Бэкенд — эндпоинты (база `http://localhost:4000`)
Ответы обёрнуты: `{success, data}` / ошибки `{success:false, error}`. Везде кроме `POST /auth/login`, `GET /health`, `GET /media/...` нужен `Authorization: Bearer <token>`.

- **Auth**: `POST /auth/login {pin}` → профиль + JWT.
- **Справочники (чтение)**: `GET /outlets`, `GET /employees?outlet_id=`, `GET /products`, `GET /norms`.
- **Админ (owner)**:
  - Точки: `POST /admin/outlets`, `PATCH /admin/outlets/{id}`
  - Сотрудники: `POST /admin/employees`, `PATCH /admin/employees/{id}` (вкл. деактивацию)
  - Продукты: `POST /admin/products`, `PATCH /admin/products/{id}`
  - Нормы: `POST /admin/norms`
  - QR: `POST /admin/qr-tokens`
- **Фото**: `POST /photos` (base64 → S3 + метаданные + ИИ), `GET /photos/{id}`, `GET /media/{key}` (отдаёт байты из S3), `POST /photo-analysis/analyze`.
- **Списания**: `POST /write-offs`, `GET /write-offs?status=&employee_id=`, `GET /write-offs/{id}`, `PATCH /write-offs/{id}/review {decision}`.
- **Склад**: `GET /inventory/movements`, `GET /inventory/balances`, `POST /inventory/supplies`, `POST /inventory/counts`, `GET /inventory/reconciliation`.
- **Аналитика**: `GET /analytics/summary|employees|outlets|products|hourly|investigations`.
- **KPI**: `GET /kpi/outlets`.
- **Аудит**: `GET /audit/events`.
- **QR**: `GET /qr/{token}`.
- **iiko**: `GET /integrations/iiko/status`.

Полный контракт с телами запросов — `docs/API_CONTRACT.md`.

### Фронтенд (web, `:5173`)
- Лендинг с **входом в один клик по роли** (PIN-бейджи: 1111/2222/9999).
- **Сотрудник** (`/employee`): создание списания, **встроенная камера** (getUserMedia), статистика и история — из бэкенда.
- **Менеджер** (`/manager`): очередь заявок, фото-доказательство + вердикт ИИ + метаданные, одобрить/отклонить, статус iiko.
- **Владелец** (`/dashboard`): аналитика/KPI из реального бэкенда (HttpDataSource), разделы Обзор/Точки/Сотрудники/Продукты/Расследования/Сверка.
- **Админ** (`/admin`, только owner): CRUD продуктов, точек, сотрудников; нормы; статус интеграции iiko. Ссылка в сайдбаре дашборда.

### Мобайл (Flutter)
- Экраны: вход по PIN, дашборд, камера/фото (`image_picker`), новое списание, история, успех.
- Подключён к бэкенду (`ApiClient`, `/auth/login`, `/photos`, `/write-offs`), офлайн-очередь.
- В Docker собирается как **web** и отдаётся nginx на `:8080` (на телефоне — нативная сборка).

### Инфраструктура
- `docker compose up --build` поднимает весь стек.
- CI: `.github/workflows/ci.yml` (backend pytest, frontend lint/test/build, flutter analyze/test, compose smoke). CD: `.github/workflows/cd.yml` (публикация образов в GHCR).
- Alembic-миграции применяются на старте бэкенда; демо-данные сеются при `SEED_DEMO_DATA=true`.

---

## 5. Как запустить + демо

```bash
docker compose up --build
```
Затем в браузере **Ctrl+Shift+R** (сбросить кэш). URL: фронт `:5173`, мобайл `:8080`, API `:4000`, MinIO-консоль `:9101` (`minioadmin`/`minioadmin`).

Демо-PIN: **1111** сотрудник · **2222** менеджер · **9999** владелец · **3333** сотрудник (Dostyk).

Сценарий:
1. Сотрудник (1111) → «Новое списание» → продукт/кол-во/причина/этап → **камера** → фото → S3 + анализ OpenAI → комментарий → отправить.
2. Менеджер (2222) → очередь → фото + вердикт ИИ → **Одобрить** → акт в iiko + списание склада.
3. Владелец (9999) → дашборд (аналитика/KPI) + **Админ** (CRUD).

---

## 6. Как сделаны ключевые вещи

- **Auth/роли**: PIN → `pbkdf2` хеш → JWT (HS256). Защищённые роуты под `Router(guards=[require_auth])`, повышенные — `require_roles('owner'|'reviewer'|...)`. 401 без токена, 403 при недостаточной роли.
- **Хранилище фото = S3 only**: класс `PhotoStorage` (boto3, async через `to_thread`); локально MinIO + one-shot `createbuckets`. Фото отдаются через прокси `GET /media/{key}` (работает с приватным бакетом, без CORS/пресайна).
- **ИИ-анализ фото**: `OpenAiPhotoAnalyzer` (Chat Completions + image_url, `response_format=json_object`, `max_completion_tokens`). Модель по умолчанию `gpt-5.4-nano` (дешевле всего из линейки). Ключ — в `.env` (`OPENAI_API_KEY`), в git не коммитится. Если ключа нет → Anthropic → rule-based заглушка (честно помечает, что ИИ не запускался).
- **iiko**:
  - Реальный путь: `IikoServerWriteOffSink` → `GET /resto/api/auth` (SHA1-пароль) → `POST /resto/api/documents/import/writeoffDocument` (XML акта) → logout. Включается через `IIKO_SERVER_*`.
  - **Демо/симуляция**: `IIKO_SIMULATE=true` → `SimulatedWriteOffSink` строит реальный XML и возвращает успешный акт `AKT-xxxx` (по согласованию с организаторами). Статус в `/integrations/iiko/status` показывает `live|simulated|disabled`.
- **Миграции**: Alembic, начальная схема автогенерирована; на старте `alembic upgrade head` (через `to_thread`). Sync-драйверы: sqlite/psycopg.
- **Сид данных**: `seed_reference_data` (5 точек, 11 сотрудников, 8 продуктов, нормы, opening balances) — всегда; `seed_demo_history` (~300 списаний за 30 дней, реалистичные статусы/причины/кластеры) — только при `SEED_DEMO_DATA=true` (тесты остаются изолированными).
- **Реальные данные на дашборде**: `HttpDataSource` реализует интерфейс `DashboardDataSource`, считая все срезы из реальных `/write-offs` + аналитики (без мока в живом пути).
- **Камера**: виджет `CameraCapture` (getUserMedia → `<video>` → canvas → JPEG base64 → существующий аплоад в S3+ИИ). Фолбэк на загрузку файла. Работает на localhost (secure context).

---

## 7. Чего НЕТ / не доделано

- **iiko вживую не проверен** — нет боевого сервера/кредов; код по контракту + покрыт мок-тестами; по умолчанию симуляция.
- **Мобайл не протестирован кликами** — собирается/запускается как web, экран входа подключён к бэкенду, но полный клик-прогон вручную не делался (headless Flutter не скриптуется).
- **QR**: бэкенд резолвит токены, но в UI генерация/сканирование QR минимальны (мобайл — без экрана сканера).
- **Сложные drill-down дашборда** (досье сотрудника, разбивка по сменам/этапам) считаются из реальных данных, но часть «нарративных» полей — производные эвристики, не отдельные сущности БID.
- **Нет хард-удаления** продуктов/точек (есть деактивация сотрудников; продукты/точки — только редактирование, из-за FK).
- **Нет фонового воркера/ретраев** для iiko — синхронизация инлайн при одобрении.
- **Demo-видео** записано локально (`demo.webm`), в git не коммитится.
- **Бандл фронта ~880 КБ** одним чанком (нет code-splitting).

---

## 8. Что МОЖНО добавить (роадмап)

- Реальная интеграция iiko Server (заполнить `IIKO_SERVER_*`, маппинг точек/номенклатуры/счёта; таблицы `iiko_mappings`/`iiko_sync_jobs` + ретраи).
- Импорт продаж из iikoWeb/OLAP → движения `SALE` для точной сверки остатков.
- Полноценный QR: генерация в админке + экран сканера в мобайле (выбор точки/продукта по QR).
- Хард-удаление с проверкой ссылок / архивирование.
- Уведомления (push/Telegram) проверяющему о новой заявке.
- Code-splitting фронта, нативная сборка мобайла (APK/IPA) в CI.
- Полноценные drill-down аналитики на отдельных эндпоинтах.
- Observability: структурные логи, Sentry, метрики; бэкапы БД.

---

## 9. Подводные камни (gotchas)

- Открывать фронт по **http://localhost:5173** (не https) и делать **Ctrl+Shift+R** после пересборки (кэш JS).
- Порты 5432/9000 часто заняты → переопределены в `.env` (5544/9100/9101).
- Tailwind **v4**: вход `@import "tailwindcss"; @config "../../tailwind.config.js"` (директивы v3 ничего не генерируют).
- GPT-5 модели требуют `max_completion_tokens` (не `max_tokens`).
- iiko `status` теперь плоский объект (`provider/mode/...`), не вложенный.
- Очень мелкие тест-картинки OpenAI отвергает (`image_parse_error`) — реальное фото анализируется нормально, ошибка обрабатывается мягко.

---

## 10. Проверка (тесты)

- Backend: **56 тестов** (`pytest`) — auth/guards, write-off→inventory, photos+metadata (S3 через moto), iiko sink (реальный+симуляция), OpenAI (мок), analytics/KPI, QR, e2e, admin CRUD.
  ```bash
  docker run --rm -v "$PWD/backend:/app" -w /app python:3.12-slim sh -c "pip install -e .[test] && pytest -q"
  ```
- Frontend: **tsc + vitest (17) + build**.
  ```bash
  npm install && npm run lint -w @hackathon/frontend && npm test -w @hackathon/frontend && npm run build -w @hackathon/frontend
  ```
- OpenAI ключ проверен вживую (Vision вернул JSON-вердикт).

---

## 11. Переменные окружения (`.env`)

| Переменная | Назначение |
|---|---|
| `POSTGRES_PORT/USER/PASSWORD/DB` | Postgres |
| `DATABASE_URL` | строка подключения бэкенда |
| `JWT_SECRET` | подпись JWT |
| `SEED_DEMO_DATA` | сеять демо-историю (true для демо) |
| `S3_BUCKET/REGION/ENDPOINT_URL`, `MINIO_ROOT_USER/PASSWORD`, `MINIO_PORT/CONSOLE_PORT` | хранилище фото |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | ИИ-анализ (модель `gpt-5.4-nano`) |
| `ANTHROPIC_API_KEY` | запасной ИИ |
| `IIKO_SIMULATE` | симуляция iiko (true для демо) |
| `IIKO_SERVER_BASE_URL/LOGIN/PASSWORD_SHA1/STORE_ID/ACCOUNT_ID` | реальный iiko Server |
| `VITE_API_BASE_URL`, `MOBILE_API_BASE_URL`, `MOBILE_PORT` | клиенты |

> Секреты (`OPENAI_API_KEY` и т.д.) в `.env` — **в git не попадают** (gitignored). Ротируйте ключ OpenAI после хакатона.
