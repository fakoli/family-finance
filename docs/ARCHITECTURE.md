# Architecture

This document describes the internal architecture of FamilyFinance — how the backend, frontend, task queue, and database fit together.

## System Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│  PostgreSQL   │
│  React/Vite  │     │   FastAPI    │     │              │
│   :5173      │     │   :8000      │     │   :5432      │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │                     ▲
                            ▼                     │
                     ┌──────────────┐     ┌───────┴──────┐
                     │    Redis     │◀────│ Celery Worker │
                     │   :6379     │     │              │
                     └──────┬───────┘     └──────────────┘
                            │                     ▲
                            │             ┌───────┴──────┐
                            └────────────▶│ Celery Beat  │
                                          │  (scheduler) │
                                          └──────────────┘
```

**Six Docker services:**

| Service | Image/Build | Port | Role |
|---------|-------------|------|------|
| `postgres` | postgres:16-alpine | 5432 | Primary data store |
| `redis` | redis:7-alpine | 6379 | Celery broker, file upload cache |
| `backend` | ./backend | 8000 | FastAPI API server |
| `celery-worker` | ./backend | — | Processes import + categorization tasks |
| `celery-beat` | ./backend | — | Schedules periodic file directory scans |
| `frontend` | ./frontend | 5173 | Vite dev server (React SPA) |

## Backend

### Directory Structure

```
backend/app/
├── main.py              # FastAPI app, lifespan, CORS, route registration
├── config.py            # Pydantic Settings (env-based configuration)
├── database.py          # Dual async/sync session factories
├── cli.py               # Click CLI for user management
├── seed_categories.py   # Seed default category hierarchy
├── api/                 # Route handlers (thin controllers)
│   ├── deps.py          # Dependencies: get_db, get_current_user, get_admin_user
│   ├── auth.py          # /auth — register, login, me
│   ├── accounts.py      # /accounts — CRUD
│   ├── transactions.py  # /transactions — list (filterable), update
│   ├── categories.py    # /categories — hierarchical CRUD
│   ├── dashboard.py     # /dashboard — aggregated summary
│   ├── imports.py       # /imports — upload, history, progress (SSE)
│   ├── ai.py            # /ai — categorize, categorize-all, query
│   ├── admin.py         # /admin — user CRUD, stats, import jobs
│   └── parser_schemas.py # /parser-schemas — custom column mappings
├── models/              # SQLAlchemy ORM models (one per file)
│   ├── user.py
│   ├── account.py
│   ├── transaction.py
│   ├── category.py
│   ├── import_job.py
│   ├── institution.py
│   └── parser_schema.py
├── schemas/             # Pydantic request/response models
├── services/            # Business logic layer
│   ├── auth_service.py
│   ├── import_service.py
│   ├── categorization_service.py
│   ├── schema_inference_service.py
│   └── ai_query_service.py
├── plugins/             # Extensible plugin system
│   ├── base.py          # Abstract base classes
│   ├── registry.py      # Global plugin registry + auto-discovery
│   ├── parsers/         # File parser plugins
│   │   ├── rocket_money.py
│   │   └── schema_based.py
│   └── ai_providers/    # AI provider plugins
│       ├── claude_provider.py
│       └── openai_provider.py
└── tasks/               # Celery tasks
    ├── celery_app.py    # Celery config, Beat schedule, worker_init
    └── import_tasks.py  # scan → process → categorize chain
```

### Request Flow

```
HTTP Request
  → FastAPI Route (api/)
    → Pydantic Schema validation
      → Service function (services/)
        → SQLAlchemy Model (models/)
          → PostgreSQL
```

Routes are thin controllers: validate input, call service, return response. Services contain all business logic and database queries.

### Dual Database Sessions

FastAPI routes are async, but Celery workers run synchronously. `database.py` provides two session factories:

| Factory | Driver | Used By |
|---------|--------|---------|
| `async_session_factory` | asyncpg | API routes via `get_db()` dependency |
| `sync_session_factory` | psycopg2 | Celery tasks, CLI commands |

The sync URL is derived automatically by replacing `+asyncpg` with `+psycopg2` in `DATABASE_URL`.

### Authentication

- **Registration:** bcrypt password hashing, unique username/email
- **Login:** Verify credentials, issue JWT (HS256, configurable TTL)
- **Protected routes:** `get_current_user()` dependency decodes JWT, fetches user
- **Admin routes:** `get_admin_user()` wraps `get_current_user()`, raises 403 if not `is_admin`

### API Response Shapes

```json
// Single resource
{ "data": { ... } }

// List
{ "data": [ ... ], "total": 42 }

// Error
{ "detail": "Error message" }
```

## Import Pipeline

The import pipeline is a three-stage Celery task chain that processes uploaded files asynchronously with real-time progress tracking.

### Stage 1: File Intake

Two entry points feed files into the pipeline:

**Upload (API):** `POST /imports/upload` → file bytes stored in Redis (`import_file:{job_id}`, TTL 1h) → Celery chain dispatched

**Watch directory (Beat):** `scan_import_directory` task runs every 30s → scans `IMPORT_WATCH_DIR` for .csv/.ofx/.qfx → creates ImportJob → dispatches chain

### Stage 2: Processing (`process_import_task`)

```
Read file (Redis or disk)
  → Detect parser (plugin registry)
    → Parse rows into transaction dicts
      → For each row:
        ├── Get/create Institution
        ├── Get/create Account (under user)
        ├── Get/create Category (or "Uncategorized")
        ├── Check for duplicates (date + amount + description + account)
        └── Insert Transaction if unique
  → Update ImportJob counters (imported, duplicates, total)
  → Clean up Redis cache
```

Progress is reported via `on_progress` callback every 100 rows. Retries up to 2 times on failure (60s delay).

### Stage 3: Categorization (`categorize_import_task`)

```
Fetch uncategorized transactions from import
  → Batch into groups of 20
    → AI provider categorize_batch()
      → Fuzzy-match AI response to DB categories
        → Update transaction.category_id
  → Update ImportJob.categorized_rows
```

Categorization is **best-effort** — individual batch failures are logged as warnings, and the job always reaches `COMPLETED` status.

### Status Progression

```
PENDING → PROCESSING → CATEGORIZING → COMPLETED
                 ↓                          ↓
              FAILED              PARTIALLY_FAILED
```

`process_import_task` intentionally does NOT set COMPLETED — it leaves status at PROCESSING so `categorize_import_task` controls the final status.

### Progress Tracking (SSE)

`GET /imports/{job_id}/progress` returns a Server-Sent Events stream. The backend polls the ImportJob record every 2 seconds and yields JSON events until a terminal status is reached. The frontend uses `EventSource` to update progress bars in real time.

## Plugin System

Four extensible plugin types defined in `plugins/base.py`:

| Type | Base Class | Key Methods | Purpose |
|------|-----------|-------------|---------|
| Parser | `FileParserPlugin` | `detect()`, `parse()` | Parse CSV/OFX/QFX/PDF files |
| Data Source | `DataSourcePlugin` | `fetch_transactions()`, `fetch_accounts()` | Pull from bank APIs |
| AI Provider | `AIProviderPlugin` | `categorize()`, `categorize_batch()`, `query()` | AI categorization and queries |
| Notification | `NotificationPlugin` | `send()` | Alerts and notifications |

### Discovery

`registry.discover()` walks `plugins/parsers/` and `plugins/ai_providers/` via `importlib`. Each plugin module exports a `register_plugin()` function that adds its instance to the global registry. Discovery runs at:

- **FastAPI startup** (lifespan context manager in `main.py`)
- **Celery worker init** (`worker_init` signal in `celery_app.py`)

### Current Implementations

**Parsers:**
- `RocketMoneyParser` — Detects and parses Rocket Money CSV exports
- `SchemaBasedParser` — Uses `ParserSchema` DB records for user-defined column mappings

**AI Providers:**
- `ClaudeProvider` — Anthropic Claude (claude-sonnet-4-5-20250929) for categorization, batch categorization, queries, merchant normalization
- `OpenAIProvider` — OpenAI API with similar interface

### Adding a New Plugin

1. Create a module in `plugins/parsers/` or `plugins/ai_providers/`
2. Implement the relevant base class
3. Export a `register_plugin()` function that calls `registry.register()`
4. The module will be auto-discovered at startup

## Database Schema

### Entity Relationship Diagram

```
┌──────────┐     ┌───────────┐     ┌─────────────┐
│   User   │──1:M──│  Account  │──1:M──│ Transaction │
└──────────┘     └───────────┘     └─────────────┘
                       │ M:1               │ M:1
                       ▼                   ▼
                ┌─────────────┐     ┌──────────┐
                │ Institution │     │ Category │
                └─────────────┘     └──────────┘
                                         │ self
                                         ▼
                                    ┌──────────┐
                                    │ (parent) │
                                    └──────────┘

┌──────────┐     ┌─────────────┐
│   User   │──1:M──│  ImportJob  │──1:M──┐
└──────────┘     └─────────────┘        │
                                         ▼
                                   ┌─────────────┐
                                   │ Transaction │
                                   └─────────────┘

┌──────────┐     ┌──────────────┐
│   User   │──1:M──│ ParserSchema │
└──────────┘     └──────────────┘
```

### Tables

**users** — Authentication and authorization
- UUID pk, username (unique), email (unique), hashed_password
- is_active, is_admin booleans
- created_at, updated_at

**accounts** — Financial accounts
- UUID pk, user_id FK, institution_id FK (nullable)
- name, account_type (enum: checking, savings, credit_card, brokerage, retirement, crypto, hsa, loan, mortgage, cash)
- account_number_last4, is_shared, balance_cents
- created_at, updated_at

**transactions** — Individual financial transactions
- UUID pk, account_id FK, category_id FK (nullable), import_job_id FK (nullable)
- amount_cents (integer), date, original_date
- description, original_description, merchant_name, custom_name
- note, tags (JSON), is_transfer, is_tax_deductible
- created_at, updated_at

**categories** — Hierarchical category tree
- UUID pk, parent_id FK (self-referencing, nullable)
- name, icon, color, is_system
- created_at, updated_at

**institutions** — Financial institutions
- UUID pk, name (unique), created_at

**import_jobs** — File import tracking
- UUID pk, user_id FK
- status (enum: pending, processing, categorizing, completed, failed, partially_failed)
- file_name, file_path, source ("upload" or "watch")
- total_rows, imported_rows, duplicate_rows, processed_rows, categorized_rows, uncategorized_rows
- error_message, celery_task_id
- created_at, updated_at, completed_at

**parser_schemas** — User-defined file column mappings
- UUID pk, user_id FK
- name (unique), description, file_type (csv/ofx/qfx/pdf)
- detection_rules, column_mapping, transform_rules (JSON)
- sample_data (JSON), is_active, created_by_ai
- created_at, updated_at

### Conventions

- UUID primary keys on all tables
- `created_at` / `updated_at` timestamps on all tables
- All monetary amounts stored as integers (cents)
- Schema changes via Alembic migrations only (4 migrations: 001–004)

### Migrations

| # | File | Description |
|---|------|-------------|
| 001 | `001_initial_schema.py` | Users, institutions, categories, accounts, transactions, import_jobs |
| 002 | `002_add_import_automation.py` | Add categorizing/partially_failed statuses, processed_rows field |
| 003 | `003_add_admin_features.py` | Add is_admin to users |
| 004 | `004_add_parser_schemas.py` | ParserSchema table |

## Frontend

### Directory Structure

```
frontend/src/
├── main.tsx              # Entry point, React Query provider
├── App.tsx               # BrowserRouter, lazy-loaded routes, ProtectedRoute
├── index.css             # Tailwind CSS imports
├── api/
│   ├── client.ts         # HTTP client (fetch wrapper, Bearer token, 401 redirect)
│   ├── hooks.ts          # TanStack Query hooks for all API endpoints
│   └── types.ts          # TypeScript interfaces for API responses
├── stores/
│   ├── auth.ts           # Zustand store: token, user, login/logout/hydrate
│   └── ui.ts             # Zustand store: sidebar state
├── pages/
│   ├── Login/            # Username/password form
│   ├── Dashboard/        # Summary cards, Recharts pie/bar charts
│   ├── Transactions/     # Filterable paginated table, inline editing
│   ├── Accounts/         # Account list, create form
│   ├── Imports/          # Drag-drop upload, progress bars, job history
│   ├── AIChat/           # Natural language queries, categorization actions
│   └── Admin/            # Tabs: Users, Import Jobs, System Stats
└── components/
    ├── Layout.tsx         # Sidebar nav (conditional Admin item), page outlet
    ├── DataTable.tsx      # Generic paginated table
    ├── DateRangePicker.tsx
    ├── AmountDisplay.tsx  # Format cents → currency
    ├── PageHeader.tsx
    ├── LoadingSpinner.tsx
    └── EmptyState.tsx
```

### State Management

| Layer | Tool | Scope |
|-------|------|-------|
| Server state | TanStack Query | API data caching, refetching, mutations |
| Client state | Zustand | Auth (token, user), UI (sidebar) |

TanStack Query is configured with 5-minute stale time and 1 retry. Import progress hooks use shorter refetch intervals (2–5 seconds) for active jobs.

### Routing

All routes are lazy-loaded with `React.lazy()` and wrapped in `Suspense`. Protected routes check `useAuthStore.isAuthenticated` and redirect to `/login`.

| Path | Page | Protected |
|------|------|-----------|
| `/login` | Login | No |
| `/` | Dashboard | Yes |
| `/transactions` | Transactions | Yes |
| `/accounts` | Accounts | Yes |
| `/imports` | Imports | Yes |
| `/ai` | AI Chat | Yes |
| `/admin` | Admin | Yes (admin only in UI) |

### Auth Flow (Frontend)

```
App mounts → useAuthStore.hydrate()
  → Check localStorage for token
    → If token exists: GET /auth/me to validate
      → Success: set user + isAuthenticated
      → 401: clear token, redirect to /login
    → If no token: redirect to /login

Login form submit → POST /auth/login
  → Store token in localStorage
  → GET /auth/me → set user state
  → Redirect to /
```

## Testing

### Infrastructure

Tests use a separate `familyfinance_test` PostgreSQL database (derived from `DATABASE_URL`). `conftest.py` creates and drops all tables per test via the `async_db` fixture.

### Key Fixtures

| Fixture | Type | Purpose |
|---------|------|---------|
| `async_db` | AsyncSession | Fresh database session with clean tables |
| `client` | httpx.AsyncClient | Test client with FastAPI app mounted |
| `auth_token` | str | JWT for a regular test user |
| `admin_token` | str | JWT for an admin test user |
| `sample_csv` | bytes | Rocket Money CSV fixture from `tests/fixtures/` |

### Running Tests

```bash
cd backend
createdb familyfinance_test   # one-time setup
pytest tests/ -v              # all tests
pytest tests/test_auth.py -v  # single file
```

`pytest-asyncio` is configured with `asyncio_mode = "auto"` in `pyproject.toml`.
