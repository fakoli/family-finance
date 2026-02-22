<p align="center">
  <img src="docs/logo.png" alt="FamilyFinance" width="120" />
</p>

<h1 align="center">FamilyFinance</h1>

<p align="center">A self-hosted personal and family finance tracker with AI-powered transaction categorization.</p>

Import bank statements (CSV, OFX, QFX), PDF bank/brokerage statements and tax forms, let AI automatically categorize your transactions, and visualize your spending with interactive dashboards. Designed for privacy-conscious users who want full control of their financial data.

## Features

- **Multi-format import** — CSV, OFX, QFX, and PDF file support with automatic parser detection
- **PDF intelligence** — AI-powered extraction from bank statements, brokerage reports, and tax forms (W-2, 1099s, 1098)
- **AI categorization** — Automatic transaction categorization via Anthropic Claude
- **Interactive dashboards** — Spending summaries, trends, and breakdowns with Recharts
- **Financial overview** — KPI cards, balance sheet, spending breakdown, subscription tracking
- **Net worth tracking** — Brokerage holdings, net worth over time, asset allocation
- **Tax insights** — Tax document checklist, income breakdown, deduction tracking
- **Multi-account support** — Track checking, savings, credit cards, brokerage, mortgage, and more
- **Category management** — Customizable category hierarchy with seed defaults
- **Import pipeline** — Background processing via Celery with real-time progress tracking
- **File watch mode** — Drop files into a directory for automatic import (via Celery Beat)
- **Bulk import CLI** — Import entire directories of files from the command line
- **Custom parser schemas** — Save and reuse column mappings for different banks
- **Admin panel** — User management, system stats, and cross-user import monitoring
- **Plugin system** — Extensible architecture for parsers, AI providers, data sources, and notifications
- **Docker-ready** — Full stack runs with a single `docker compose up`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic |
| Task Queue | Celery + Redis |
| AI | Anthropic Claude (categorization, PDF parsing, NL queries) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Charts | Recharts |
| State | TanStack Query (server), Zustand (client) |
| Database | PostgreSQL 16 |
| Deployment | Docker Compose (6 services) |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) (recommended)
- Or for local development: Python 3.12+, Node.js 18+, PostgreSQL 16, Redis 7

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-username/family-finance.git
cd family-finance

# 2. Configure environment
cp .env.example .env
# Edit .env — at minimum set SECRET_KEY, POSTGRES_PASSWORD, and ANTHROPIC_API_KEY

# 3. Start all services
docker compose up -d

# 4. Run database migrations and seed categories
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.seed_categories

# 5. Create your first user
docker compose exec backend python -m app.cli create-user \
  --username admin --email admin@example.com --password yourpassword --admin
```

Open [http://localhost:5173](http://localhost:5173) and log in.

## Importing Data

### Via Web UI

Upload CSV, OFX, QFX, or PDF files through the Imports page. Files are processed in the background with real-time progress tracking.

### Via File Watch

Drop files into the watch directory (default: `/data/imports` in the container). Celery Beat scans every 30 seconds and auto-imports new files.

### Via Bulk Import CLI

Import entire directories of files at once:

```bash
# Import all supported files from a directory
docker compose exec backend python -m app.cli bulk-import \
  --directory /data/new-imports/statements/

# With explicit user ID
docker compose exec backend python -m app.cli bulk-import \
  --directory /data/new-imports/brokerage-statements/ \
  --user-id <uuid>
```

### Supported File Types

| Format | Parser | What it extracts |
|--------|--------|-----------------|
| CSV | `rocket_money` | Transactions (Rocket Money export format) |
| OFX/QFX | `ofx` | Transactions (Open Financial Exchange) |
| PDF (bank statement) | `pdf_statement` | Transactions from Ally, Chase, BofA, PennyMac, Amex |
| PDF (brokerage) | `pdf_brokerage` | Holdings from Schwab, Fidelity statements |
| PDF (tax form) | `pdf_tax` | W-2, 1099-INT/DIV/B/G, 1098, 1099-COMPOSITE data |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | PostgreSQL username | `familyfinance` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `changeme` |
| `POSTGRES_DB` | PostgreSQL database name | `familyfinance` |
| `DATABASE_URL` | Full async database URL | `postgresql+asyncpg://...` |
| `REDIS_URL` | Redis connection URL | `redis://redis:6379/0` |
| `SECRET_KEY` | JWT signing key | `change-me-in-production` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token TTL in minutes | `1440` |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI features | — |
| `OPENAI_API_KEY` | OpenAI API key for AI features | — |
| `IMPORT_DEFAULT_USER_ID` | Default user UUID for file-watch imports | — |
| `IMPORT_WATCH_DIR` | Directory to watch for new files | `/data/imports` |
| `IMPORT_SCAN_INTERVAL_SECONDS` | File scan interval | `30` |

## Local Development

### Backend

```bash
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000

# In separate terminals:
celery -A app.tasks.celery_app worker --loglevel=info
celery -A app.tasks.celery_app beat --lollevel=info
```

### Frontend

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
```

### Linting

```bash
# Backend
cd backend
ruff check app/
ruff format app/

# Frontend
cd frontend
npx tsc --noEmit
```

## CLI Reference

Run inside the backend container (`docker compose exec backend ...`) or with your venv active:

### User Management

| Command | Description |
|---------|-------------|
| `python -m app.cli create-user --username NAME --email EMAIL --password PASS [--admin]` | Create a user |
| `python -m app.cli list-users` | List all users |
| `python -m app.cli set-admin --username NAME --admin` | Grant admin role |
| `python -m app.cli set-admin --username NAME --no-admin` | Revoke admin role |
| `python -m app.cli set-active --username NAME --inactive` | Deactivate a user |
| `python -m app.cli reset-password --username NAME --password PASS` | Reset password |

### Import Management

| Command | Description |
|---------|-------------|
| `python -m app.cli bulk-import --directory PATH [--user-id UUID]` | Import all files from a directory |
| `python -m app.cli import-errors` | Show all import jobs with errors |
| `python -m app.cli import-errors --job-id UUID` | Show specific job error details |
| `python -m app.cli retry-categorize --job-id UUID` | Re-run AI categorization for a job |
| `python -m app.cli force-complete --job-id UUID` | Force a stuck job to COMPLETED |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — system design, data flows, database schema, plugin system
- [Implementation Guide](docs/IMPLEMENTATION_GUIDE.md) — detailed plans for all roadmap phases
- [Roadmap](ROADMAP.md) — planned features across 4 phases
- [Contributing](CONTRIBUTING.md) — how to contribute
- [Changelog](CHANGELOG.md) — release history

## Architecture

For the full architecture document, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Request Flow

```
Route handler (api/) → Service (services/) → Model (models/) → Database
```

Routes are thin: validate input via Pydantic schema, call service, return response. Services contain all business logic and database queries.

### Import Pipeline

Three chained Celery tasks process each import:

1. **Scan** — Celery Beat scans `IMPORT_WATCH_DIR` every 30s for new files
2. **Process** — Detects file type, selects parser, extracts data, routes by document type:
   - Transactions → dedup + save to `transactions` table
   - Brokerage holdings → save to `brokerage_holdings` table
   - Tax forms → save to `tax_documents` table
3. **Categorize** — AI categorizes uncategorized transactions in batches of 20

Status: `PENDING → PROCESSING → CATEGORIZING → COMPLETED` (or `FAILED`)

### Plugin System

Four extensible plugin types:

| Type | Purpose |
|------|---------|
| `FileParserPlugin` | Parse CSV/OFX/QFX/PDF files |
| `DataSourcePlugin` | Pull from bank APIs |
| `AIProviderPlugin` | AI categorization and queries |
| `NotificationPlugin` | Alerts and notifications |

Plugins are discovered at startup via `registry.discover()` and each module exports a `register_plugin()` function.

### Database Schema

| Table | Purpose |
|-------|---------|
| `users` | User accounts with auth |
| `accounts` | Financial accounts (checking, savings, brokerage, etc.) |
| `institutions` | Financial institutions |
| `categories` | Transaction categories (hierarchical) |
| `transactions` | Individual financial transactions |
| `import_jobs` | Import job tracking with status/progress |
| `parser_schemas` | User-defined CSV column mappings |
| `statements` | Imported document tracking (all PDF types) |
| `brokerage_holdings` | Point-in-time investment positions |
| `tax_documents` | Extracted tax form data (W-2, 1099s, 1098) |

## API Endpoints

All endpoints are under `/api/v1/`. Authentication via JWT Bearer token.

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Log in, receive JWT |
| GET | `/auth/me` | Current user profile |

### Accounts & Transactions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/accounts` | List accounts |
| POST | `/accounts` | Create account |
| GET/PATCH/DELETE | `/accounts/{id}` | Account CRUD |
| GET | `/transactions` | List transactions (filterable) |
| GET/PATCH | `/transactions/{id}` | Transaction detail / update |
| GET | `/categories` | List categories |
| POST/PATCH | `/categories[/{id}]` | Category CRUD |

### Dashboards & Analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard/summary` | Dashboard aggregations |
| GET | `/overview/kpi-cards` | Financial KPI cards |
| GET | `/overview/spending-breakdown` | Spending by category |
| GET | `/overview/balance-sheet` | Assets vs liabilities |
| GET | `/overview/income-expense-trend` | Monthly income/expense trend |
| GET | `/overview/subscriptions` | Recurring subscription detection |
| GET | `/overview/merchant-deep-dive` | Top merchants with trends |

### Brokerage & Net Worth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/brokerage/summary` | Net worth summary (assets, liabilities, net worth) |
| GET | `/brokerage/holdings` | All current brokerage holdings |
| GET | `/brokerage/history` | Net worth over time |
| GET | `/brokerage/allocation` | Asset allocation breakdown |

### Tax

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tax/summary?year=2025` | Tax summary for year |
| GET | `/tax/documents?year=2025` | Tax documents with status |
| GET | `/tax/income-breakdown?year=2025` | Income sources breakdown |
| GET | `/tax/deductible?year=2025` | Tax-deductible transactions |

### Imports & Statements

| Method | Path | Description |
|--------|------|-------------|
| POST | `/imports/upload` | Upload file for import |
| GET | `/imports/history` | Import job history |
| GET | `/imports/{id}` | Import job status |
| GET | `/imports/{id}/progress` | Real-time progress |
| POST | `/imports/{id}/retry-categorize` | Retry failed categorization |
| GET | `/statements` | List all imported statements |
| GET | `/statements/{id}` | Statement details |

### AI

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ai/categorize` | Categorize transactions |
| POST | `/ai/categorize-all` | Categorize all uncategorized |
| POST | `/ai/query` | Natural language query |

### Admin

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PATCH/DELETE | `/admin/users[/{id}]` | Admin user management |
| GET | `/admin/stats` | System statistics |
| GET | `/admin/import-jobs` | All import jobs (admin) |
| POST | `/admin/import-jobs/{id}/force-complete` | Force-complete stuck job |

### Other

| Method | Path | Description |
|--------|------|-------------|
| GET/PATCH/DELETE | `/parser-schemas[/{id}]` | Parser schema CRUD |
| GET | `/health` | Health check |

## Testing

Tests require a `familyfinance_test` PostgreSQL database:

```bash
cd backend
createdb familyfinance_test    # if not already created
pytest tests/ -v
```

## License

[MIT](LICENSE)
