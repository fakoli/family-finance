# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run backend (Docker — preferred)
docker compose up backend        # from project root
docker compose logs -f backend   # follow logs

# Run locally (Python 3.12 venv)
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000

# Celery workers (required for imports, AI categorization)
celery -A app.tasks.celery_app worker --loglevel=info
celery -A app.tasks.celery_app beat --loglevel=info

# Lint
ruff check app/
ruff format app/

# Test (requires familyfinance_test PostgreSQL database)
pytest tests/ -v
pytest tests/test_auth.py -v              # single file
pytest tests/test_auth.py::test_login -v  # single test

# Database migrations
alembic revision --autogenerate -m "description"
alembic upgrade head
alembic downgrade -1

# Seed default categories
python -m app.seed_categories

# CLI user management
python -m app.cli create-user --username admin --email admin@example.com --password secret --admin
python -m app.cli list-users
python -m app.cli set-admin --username admin --admin
python -m app.cli set-admin --username admin --no-admin
python -m app.cli set-active --username admin --inactive
python -m app.cli reset-password --username admin --password newpass
```

## Architecture

### Request Flow

Route handler (`api/`) → Service (`services/`) → Model (`models/`) → Database

Routes are thin: validate input via Pydantic schema (`schemas/`), call service, return response. Services contain business logic and database queries.

### Dual Database Sessions

`database.py` exposes two session factories because FastAPI routes are async but Celery workers are sync:

- **`async_session_factory`** (asyncpg) — used by API routes via `get_db()` dependency
- **`sync_session_factory`** (psycopg2) — used by Celery tasks and CLI directly

The sync URL is derived by replacing `+asyncpg` with `+psycopg2` in `DATABASE_URL`.

### Import Pipeline (Celery Task Chain)

Three chained tasks in `tasks/import_tasks.py`:

1. **`scan_import_directory`** (periodic via Beat, every 30s) — scans `IMPORT_WATCH_DIR` for new CSV/OFX/QFX files, creates PENDING ImportJob, dispatches chain
2. **`process_import_task`** — reads file from disk (watch) or Redis (upload), calls `run_import_sync()`, updates `processed_rows` for progress tracking
3. **`categorize_import_task`** — receives result dict from step 2, runs AI categorization on uncategorized transactions in batches of 20

Status progression: `PENDING → PROCESSING → CATEGORIZING → COMPLETED` (or `FAILED` / `PARTIALLY_FAILED`)

`process_import_task` intentionally does NOT set COMPLETED — it leaves status at PROCESSING so `categorize_import_task` controls the final status.

Uploaded file bytes are stored in Redis (key `import_file:{job_id}`, TTL 1h) and cleaned up after processing.

### Plugin System

Four plugin types defined in `plugins/base.py`:

| Type | Base Class | Method | Purpose |
|------|-----------|--------|---------|
| `parser` | `FileParserPlugin` | `detect()` + `parse()` | Parse CSV/OFX/QFX/PDF files |
| `data_source` | `DataSourcePlugin` | `fetch_transactions()` | Pull from bank APIs |
| `ai_provider` | `AIProviderPlugin` | `categorize()`, `query()` | AI features |
| `notification` | `NotificationPlugin` | `send()` | Alerts |

Discovery: `registry.discover()` walks `plugins/parsers/` and `plugins/ai_providers/` via `importlib`. Called at FastAPI startup (lifespan) and Celery worker init (`worker_init` signal).

Each plugin module exports a `register_plugin()` function that adds the plugin instance to the registry.

### Admin System

- `api/deps.py` has `get_admin_user()` — wraps `get_current_user()`, raises 403 if `user.is_admin` is False
- Admin routes under `/admin/` prefix: user CRUD, system stats, cross-user import job listing
- User model has `is_admin` boolean field (default False)

### Router Registration

All routers mount under `/api/v1` in `main.py`. Route order matters for FastAPI path matching — static paths (e.g., `/imports/history`) must come before parameterized paths (e.g., `/imports/{job_id}`).

### Alembic

Converts the async DATABASE_URL to sync for migration runner. All models must be imported in `models/__init__.py` for autogenerate to detect changes. Current migrations: 001 (initial schema), 002 (import automation), 003 (is_admin).

### Test Infrastructure

Tests use a separate `familyfinance_test` database (auto-derived from DATABASE_URL). `conftest.py` creates/drops all tables per test. Key fixtures: `async_db`, `client` (httpx.AsyncClient with app), `auth_token`, `admin_token`, `sample_csv`. `pytest-asyncio` with `asyncio_mode = "auto"`.
