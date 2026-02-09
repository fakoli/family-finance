# Implementation Guide

This document provides detailed implementation plans for each phase in the [Roadmap](../ROADMAP.md). Each feature includes the database changes, backend work, frontend work, and files to modify.

---

## Phase 1 — Core Improvements

### 1.1 Additional File Parsers

**Goal:** Support PDF bank statements and more CSV formats (Chase, Bank of America, Wells Fargo, Mint, YNAB).

**Backend:**
- Create new parser plugins in `backend/app/plugins/parsers/`:
  - `chase_csv.py` — Chase CSV format (Description, Posting Date, Amount, Type, Balance, Check or Slip #)
  - `bofa_csv.py` — Bank of America CSV
  - `wells_fargo_csv.py` — Wells Fargo CSV
  - `mint_csv.py` — Mint export format
  - `ynab_csv.py` — YNAB export format
  - `pdf_parser.py` — PDF statement parsing (requires `pdfplumber` or `pymupdf`)
- Each parser implements `FileParserPlugin` with `detect()` and `parse()` methods
- Register via `register_plugin()` — auto-discovered at startup

**Files to create:**
- `backend/app/plugins/parsers/chase_csv.py`
- `backend/app/plugins/parsers/bofa_csv.py`
- `backend/app/plugins/parsers/pdf_parser.py`
- (one file per format)

**Files to modify:**
- `backend/pyproject.toml` — add `pdfplumber` dependency for PDF support

**Testing:**
- Add fixture files in `backend/tests/fixtures/` for each format
- Test detection and parsing accuracy

---

### 1.2 Batch Transaction Editing

**Goal:** Select multiple transactions and update category, tags, or notes in one operation.

**Backend:**
- Add `PATCH /api/v1/transactions/batch` endpoint
- Request body: `{ transaction_ids: UUID[], updates: { category_id?, tags?, note?, is_transfer? } }`
- Service function: bulk update with single DB query

**Files to modify:**
- `backend/app/api/transactions.py` — add batch endpoint
- `backend/app/schemas/transaction.py` — add `TransactionBatchUpdate` schema

**Frontend:**
- Add checkbox column to transaction table
- Add bulk action toolbar (appears when items selected)
- Category dropdown, tag input, note field for bulk updates
- Mutation hook for batch endpoint

**Files to modify:**
- `frontend/src/pages/Transactions/index.tsx` — add selection state, bulk toolbar
- `frontend/src/api/hooks.ts` — add `useBatchUpdateTransactions()` mutation
- `frontend/src/api/types.ts` — add batch update types

---

### 1.3 Transaction Splitting

**Goal:** Split one transaction across multiple categories (e.g., a Walmart receipt: $30 groceries + $20 household).

**Database:**
- New migration: create `transaction_splits` table
  - `id` UUID pk
  - `transaction_id` FK → transactions
  - `category_id` FK → categories
  - `amount_cents` integer
  - `note` text (nullable)
  - `created_at`, `updated_at`
- Add `is_split` boolean to transactions table

**Backend:**
- Add `POST /api/v1/transactions/{id}/splits` — create splits (amounts must sum to transaction total)
- Add `GET /api/v1/transactions/{id}/splits` — list splits
- Add `DELETE /api/v1/transactions/{id}/splits` — remove splits (revert to single category)
- Update dashboard aggregation to use splits when present

**Files to create:**
- `backend/app/models/transaction_split.py`
- `backend/app/schemas/transaction_split.py`

**Files to modify:**
- `backend/app/models/__init__.py` — import TransactionSplit
- `backend/app/models/transaction.py` — add `is_split` field, splits relationship
- `backend/app/api/transactions.py` — add split endpoints
- `backend/app/services/import_service.py` — handle splits in dashboard queries
- `backend/app/api/dashboard.py` — aggregate splits correctly
- New Alembic migration

**Frontend:**
- Split modal on transaction row: add category + amount rows that sum to total
- Show split indicator icon in transaction table

---

### 1.4 API Rate Limiting

**Goal:** Protect API from abuse with per-user rate limits.

**Backend:**
- Add `slowapi` dependency
- Configure rate limiter in `main.py` using Redis as backend
- Apply limits: 100 requests/minute for general endpoints, 10/minute for AI endpoints, 5/minute for file uploads

**Files to modify:**
- `backend/pyproject.toml` — add `slowapi`
- `backend/app/main.py` — configure and mount rate limiter
- `backend/app/api/ai.py` — add stricter rate limits
- `backend/app/api/imports.py` — add upload rate limit

---

### 1.5 Cursor-Based Pagination

**Goal:** Replace offset pagination with cursor-based for better performance on large datasets.

**Backend:**
- Update transaction list endpoint to accept `cursor` (UUID of last item) and `limit` instead of `page`/`per_page`
- Return `next_cursor` in response
- Keep backward compatibility: support both `page` and `cursor` params during transition

**Files to modify:**
- `backend/app/api/transactions.py` — add cursor param, cursor-based query
- `backend/app/schemas/transaction.py` — add cursor fields to response

**Frontend:**
- Update transaction table to use infinite scroll or "Load More" with cursor
- Update `useTransactions()` hook to use `useInfiniteQuery`

**Files to modify:**
- `frontend/src/api/hooks.ts` — switch to `useInfiniteQuery`
- `frontend/src/pages/Transactions/index.tsx` — infinite scroll UI

---

### 1.6 Duplicate Transaction Detection

**Goal:** Improve deduplication during import with configurable rules and a review UI.

**Backend:**
- Enhance dedup logic in `import_service.py` with fuzzy matching (date ±1 day, amount exact, description similarity > 80%)
- Mark potential duplicates as `is_potential_duplicate` instead of silently skipping
- Add `GET /api/v1/transactions/duplicates` endpoint
- Add `POST /api/v1/transactions/duplicates/resolve` — merge or dismiss

**Database:**
- Add `is_potential_duplicate` boolean to transactions
- Add `duplicate_group_id` UUID for grouping related duplicates

**Frontend:**
- Duplicates review page showing grouped potential duplicates
- Actions: keep, merge (combine into one), dismiss (mark as not duplicate)

---

### 1.7 Full-Text Transaction Search

**Goal:** Fast search across description, merchant_name, notes using PostgreSQL full-text search.

**Database:**
- New migration: add `search_vector` tsvector column to transactions
- Create GIN index on search_vector
- Add trigger to auto-update search_vector on insert/update

**Backend:**
- Update transaction list query to use `ts_query` when search param is provided
- Much faster than current `ILIKE %term%` approach

**Files to modify:**
- New Alembic migration for tsvector column + index + trigger
- `backend/app/api/transactions.py` — use full-text search query

---

## Phase 2 — Advanced Features

### 2.1 Budget Tracking and Alerts

**Goal:** Set monthly/weekly budgets per category and track spending against them.

**Database:**
- New `budgets` table:
  - `id` UUID pk, `user_id` FK, `category_id` FK
  - `amount_cents` integer, `period` enum (weekly, monthly, yearly)
  - `start_date`, `is_active`
  - `created_at`, `updated_at`
- New `budget_alerts` table:
  - `id` UUID pk, `budget_id` FK
  - `threshold_percent` integer (e.g., 80, 100)
  - `triggered_at` timestamp (nullable)

**Backend:**
- CRUD endpoints: `GET/POST/PATCH/DELETE /api/v1/budgets`
- `GET /api/v1/budgets/summary` — current period spending vs budget per category
- Budget check service: compare spending to budgets, trigger alerts at thresholds
- Celery periodic task: daily budget check

**Files to create:**
- `backend/app/models/budget.py`
- `backend/app/schemas/budget.py`
- `backend/app/api/budgets.py`
- `backend/app/services/budget_service.py`
- `backend/app/tasks/budget_tasks.py`

**Files to modify:**
- `backend/app/models/__init__.py` — import Budget
- `backend/app/main.py` — register budget router
- `backend/app/tasks/celery_app.py` — add budget check to Beat schedule

**Frontend:**
- Budget management page: create/edit budgets per category
- Budget progress bars on dashboard (spent / budget with color coding)
- Alert notifications when approaching or exceeding budget

**Files to create:**
- `frontend/src/pages/Budgets/index.tsx`

**Files to modify:**
- `frontend/src/App.tsx` — add `/budgets` route
- `frontend/src/components/Layout.tsx` — add Budgets nav item
- `frontend/src/pages/Dashboard/index.tsx` — add budget progress section
- `frontend/src/api/hooks.ts` — add budget hooks
- `frontend/src/api/types.ts` — add budget types

---

### 2.2 Savings Goals

**Goal:** Define savings goals with target amounts and deadlines, track progress over time.

**Database:**
- New `savings_goals` table:
  - `id` UUID pk, `user_id` FK, `account_id` FK (nullable — track specific account)
  - `name`, `target_amount_cents`, `current_amount_cents`
  - `target_date` (nullable), `icon`, `color`
  - `is_completed`, `completed_at`
  - `created_at`, `updated_at`

**Backend:**
- CRUD endpoints: `GET/POST/PATCH/DELETE /api/v1/savings-goals`
- Auto-update `current_amount_cents` when linked account balance changes
- Progress calculation: percentage, on-track indicator, projected completion date

**Frontend:**
- Savings goals page with visual progress cards
- Goal creation modal with target amount, optional deadline, account link
- Dashboard widget showing top goals

---

### 2.3 Recurring Transaction Detection

**Goal:** Automatically detect recurring transactions (subscriptions, bills) and predict future ones.

**Backend:**
- Detection service: analyze transaction history for patterns
  - Group by merchant_name + approximate amount
  - Detect frequency (weekly, biweekly, monthly, yearly)
  - Confidence scoring
- New `recurring_transactions` table:
  - `id` UUID pk, `user_id` FK, `category_id` FK
  - `merchant_name`, `expected_amount_cents`, `frequency` enum
  - `next_expected_date`, `last_seen_date`
  - `is_confirmed` (user-verified vs auto-detected)
- `GET /api/v1/recurring` — list recurring transactions
- `POST /api/v1/recurring/detect` — trigger detection scan
- Celery task: periodic detection (weekly)

**Frontend:**
- Recurring transactions page: list with frequency, amount, next expected date
- Confirm/dismiss auto-detected patterns
- Calendar view of upcoming bills

---

### 2.4 Custom Reports

**Goal:** Generate reports comparing spending across date ranges with exportable charts.

**Backend:**
- `GET /api/v1/reports/spending` — spending by category over time (monthly/weekly granularity)
- `GET /api/v1/reports/income-vs-expense` — income vs expense trend
- `GET /api/v1/reports/category-comparison` — compare two date ranges
- `GET /api/v1/reports/merchant-summary` — top merchants by spending

**Frontend:**
- Reports page with date range selector and chart type picker
- Line charts (trends), stacked bar charts (category comparison), tables
- Print/export functionality

---

### 2.5 Multi-Currency Support

**Goal:** Store and display transactions in their original currency with exchange rate conversion.

**Database:**
- Add `currency` (char 3, default "USD") to accounts and transactions
- New `exchange_rates` table:
  - `id` UUID pk
  - `from_currency`, `to_currency` (char 3)
  - `rate` decimal, `date`
- Add `original_amount_cents`, `original_currency` to transactions

**Backend:**
- Exchange rate service: fetch daily rates from free API (e.g., frankfurter.app)
- Celery periodic task: daily rate fetch
- Convert all amounts to user's base currency for dashboard aggregation

**Frontend:**
- Currency selector per account
- Display original currency on transactions, converted amount in parentheses
- Dashboard totals in user's base currency

---

### 2.6 Transaction Tags

**Goal:** Add user-defined tags alongside categories for flexible organization.

The `tags` JSON field already exists on the Transaction model. This feature adds a proper UI and tag management.

**Backend:**
- `GET /api/v1/tags` — list all tags used by user (extracted from transactions)
- Update transaction filters to support tag-based filtering
- Bulk tag operations (add/remove tag from selection)

**Frontend:**
- Tag chips on transaction rows (clickable to filter)
- Tag input with autocomplete on transaction edit
- Tag filter in transaction list sidebar

---

### 2.7 Data Export

**Goal:** Export transactions and reports as CSV or PDF.

**Backend:**
- `GET /api/v1/export/transactions?format=csv` — filtered transaction export
- `GET /api/v1/export/transactions?format=pdf` — PDF report with summary + table
- `GET /api/v1/export/report?type=spending&format=pdf` — chart-based PDF report

**Dependencies:**
- `reportlab` or `weasyprint` for PDF generation

**Frontend:**
- Export button on transactions page and reports page
- Format selector (CSV, PDF)
- Download trigger

---

## Phase 3 — Integrations

### 3.1 Plaid Integration

**Goal:** Automatic bank account syncing via Plaid API.

**Backend:**
- New plugin: `plugins/datasources/plaid_provider.py` implementing `DataSourcePlugin`
- Plaid Link token creation endpoint
- Webhook handler for transaction updates
- Store Plaid access tokens (encrypted) in new `plaid_connections` table
- Celery task: daily transaction sync per connection

**Environment:**
- `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` (sandbox/development/production)

**Frontend:**
- Plaid Link integration (react-plaid-link)
- Connection management UI (connect, disconnect, sync status)
- Auto-import from connected banks

---

### 3.2 Open Banking API

**Goal:** European bank integration via Open Banking/PSD2 APIs.

Similar structure to Plaid but using Open Banking aggregators (TrueLayer, Yapily, or GoCardless Bank Account Data).

---

### 3.3 Webhook Notifications

**Goal:** HTTP webhooks for import events so external systems can react.

**Database:**
- New `webhooks` table:
  - `id` UUID pk, `user_id` FK
  - `url`, `events` (JSON array: ["import.completed", "import.failed", "budget.exceeded"])
  - `secret` (for HMAC signature), `is_active`

**Backend:**
- CRUD: `GET/POST/PATCH/DELETE /api/v1/webhooks`
- Webhook dispatch service: send POST with signed payload on events
- Retry logic with exponential backoff (Celery task)

---

### 3.4 Email Notifications

**Goal:** Email alerts for budget thresholds, import completion, and weekly digests.

**Backend:**
- New notification plugin: `plugins/notifications/email_provider.py`
- Email templates (Jinja2) for each notification type
- User notification preferences (opt-in per event type)
- Celery tasks: send individual emails, weekly digest

**Environment:**
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`

---

### 3.5 Calendar Integration

**Goal:** Export recurring bills and expected transactions as iCal feed.

**Backend:**
- `GET /api/v1/calendar/feed` — iCal format (.ics) of upcoming recurring transactions
- Token-based auth for calendar subscription URL (no Bearer header in calendar apps)

**Dependencies:**
- `icalendar` Python package

---

## Phase 4 — Mobile and Platform

### 4.1 Progressive Web App (PWA)

**Goal:** Make the frontend installable and app-like on mobile devices.

**Frontend:**
- Add `manifest.json` with app name, icons, theme color
- Add service worker for caching (Vite PWA plugin)
- Responsive layout improvements for mobile screens
- Touch-friendly interactions (swipe to delete, pull to refresh)

**Files to modify:**
- `frontend/vite.config.ts` — add `vite-plugin-pwa`
- `frontend/public/manifest.json` — create
- `frontend/src/` — responsive design updates across all pages

---

### 4.2 Offline Mode

**Goal:** Basic offline functionality with background sync.

**Frontend:**
- Service worker caches API responses
- Offline indicator in UI
- Queue mutations (edits, categorization) when offline
- Background sync when connection restored
- Read-only access to cached transactions/dashboard

---

### 4.3 Push Notifications

**Goal:** Browser push notifications for import completion and budget alerts.

**Backend:**
- Web Push subscription management endpoints
- `web-push` library for sending notifications
- Integrate with budget alerts and import pipeline

**Frontend:**
- Push notification permission request
- Subscription management in settings

---

### 4.4 Native Mobile App

**Goal:** Cross-platform mobile app with React Native.

**Structure:**
- New `mobile/` directory with React Native (Expo) project
- Shared API types with web frontend
- Native navigation, biometric auth, camera for receipt scanning
- Push notifications via Firebase/APNs

---

### 4.5 Multi-User Household Sharing

**Goal:** Multiple users share a household with role-based access to accounts and budgets.

**Database:**
- New `households` table: `id`, `name`, `created_by`
- New `household_members` table: `household_id`, `user_id`, `role` (owner, admin, member, viewer)
- Add `household_id` FK to accounts (nullable — personal vs shared)

**Backend:**
- Household CRUD and invitation system
- Scoped queries: personal accounts + shared household accounts
- Role-based permissions (viewers can't edit, members can add transactions, admins manage accounts)

**Frontend:**
- Household settings page
- Invite members by email
- Toggle account visibility (personal / shared with household)
- Household-level dashboard and budgets
