# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

- **Backend:** Python 3.12 + FastAPI + SQLAlchemy 2.0 + Alembic + Celery + Redis
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Recharts + TanStack Query + Zustand
- **Database:** PostgreSQL 16
- **Deployment:** Docker Compose (6 services: postgres, redis, backend, celery-worker, celery-beat, frontend)

## Commands

### Docker (preferred)

```bash
docker compose up -d                    # Start all services
docker compose logs -f backend          # Follow backend logs
docker compose exec backend alembic upgrade head  # Run migrations
docker compose exec backend python -m app.seed_categories  # Seed categories
```

### Backend (local development)

```bash
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000

# Celery (required for imports + AI categorization)
celery -A app.tasks.celery_app worker --loglevel=info
celery -A app.tasks.celery_app beat --loglevel=info

# Lint
ruff check app/
ruff format app/

# Test (requires PostgreSQL with a familyfinance_test database)
pytest tests/ -v
pytest tests/test_auth.py -v                       # single file
pytest tests/test_auth.py::test_hash_and_verify -v  # single test

# Database migrations
alembic revision --autogenerate -m "description"
alembic upgrade head
alembic downgrade -1
```

### CLI (user management)

```bash
# Inside backend container or with venv active:
python -m app.cli create-user --username admin --email admin@example.com --password secret --admin
python -m app.cli list-users
python -m app.cli set-admin --username admin --admin
python -m app.cli set-admin --username admin --no-admin
python -m app.cli set-active --username admin --inactive
python -m app.cli reset-password --username admin --password newpass
```

### Frontend

```bash
cd frontend
npm install
npm run dev          # Vite dev server on :5173
npx tsc --noEmit     # Type check
```

## Architecture

### Request Flow

Route handler (`api/`) → Service (`services/`) → Model (`models/`) → Database

Routes are thin: validate input via Pydantic schema, call service, return response. Services contain all business logic and database queries.

### Dual Database Sessions

`database.py` exposes two session factories because FastAPI routes are async but Celery workers are sync:

- **`async_session_factory`** (asyncpg) — used by API routes via `get_db()` dependency
- **`sync_session_factory`** (psycopg2) — used by Celery tasks and CLI directly

The sync URL is derived by replacing `+asyncpg` with `+psycopg2` in `DATABASE_URL`.

### Import Pipeline (Celery Task Chain)

Three chained tasks in `tasks/import_tasks.py`:

1. **`scan_import_directory`** (periodic via Beat, every 30s) — scans `IMPORT_WATCH_DIR` for new files, creates PENDING ImportJob, dispatches chain
2. **`process_import_task`** — reads file from disk (watch) or Redis (upload), calls `run_import_sync()`, updates `processed_rows` for progress
3. **`categorize_import_task`** — receives result from step 2, runs AI categorization on uncategorized transactions in batches of 20

Status progression: `PENDING → PROCESSING → CATEGORIZING → COMPLETED` (or `FAILED` / `PARTIALLY_FAILED`)

`process_import_task` intentionally does NOT set COMPLETED — it leaves status at PROCESSING so `categorize_import_task` controls the final status. Uploaded file bytes are stored in Redis (`import_file:{job_id}`, TTL 1h) and cleaned up after processing.

### Plugin System

Four plugin types in `plugins/base.py`: `FileParserPlugin`, `DataSourcePlugin`, `AIProviderPlugin`, `NotificationPlugin`. Discovery via `registry.discover()` walks `plugins/parsers/` and `plugins/ai_providers/` with `importlib`. Called at FastAPI startup (lifespan) and Celery worker init (`worker_init` signal). Each plugin module exports a `register_plugin()` function.

### Parser Schemas

`api/parser_schemas.py` provides CRUD for user-defined parser column mappings. These schemas let users save and reuse custom CSV column configurations for different financial institutions. Stored in the `parser_schemas` table (migration 004).

### Admin System

- `api/deps.py` has `get_admin_user()` dependency — wraps `get_current_user()`, raises 403 if not `is_admin`
- Admin API routes under `/api/v1/admin/` — user CRUD, system stats, cross-user import job listing
- Frontend conditionally shows Admin nav item based on `user.is_admin` from auth store

### Test Infrastructure

Tests require a `familyfinance_test` PostgreSQL database. `conftest.py` auto-creates/drops all tables per test via `async_db` fixture. Key fixtures:

- `async_db` — async session with fresh tables
- `client` — `httpx.AsyncClient` with app mounted (overrides `get_db`)
- `auth_token` / `admin_token` — JWT for regular/admin user
- `sample_csv` — reads `tests/fixtures/sample_rocket_money.csv`

`pytest-asyncio` is configured with `asyncio_mode = "auto"` in `pyproject.toml`.

## Coding Conventions

### Python (Backend)

- Python 3.12, modern type hints (`X | None` not `Optional[X]`)
- `from __future__ import annotations` in all files
- Format with ruff (line-length 100, rules: E, F, I, UP)
- SQLAlchemy 2.0 style (`mapped_column`, `select()` not `query()`)
- Pydantic V2 with `model_config = {"from_attributes": True}`
- One model per file in `models/`, one router per resource in `api/`
- All new models must be imported in `models/__init__.py` for Alembic autogenerate

### TypeScript (Frontend)

- Strict TypeScript, no `any`
- TanStack Query for server state, Zustand for client state
- Tailwind CSS only, no CSS files
- Named exports (except page components which use default exports for lazy loading)
- `interface` for object shapes, `type` for unions/intersections

### Database

- UUID primary keys, `created_at`/`updated_at` timestamps on all tables
- All monetary amounts as integers (cents)
- Migrations via Alembic only

### API Design

- RESTful under `/api/v1/`
- Response shapes: `{ data: T }` for single, `{ data: T[], total: number }` for lists
- Router order matters: static paths before parameterized paths (e.g., `/imports/history` before `/imports/{job_id}`)
