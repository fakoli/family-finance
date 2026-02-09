# Contributing to FamilyFinance

Thank you for your interest in contributing! This guide will help you get started.

## Reporting Bugs

Open a [bug report](../../issues/new?template=bug_report.md) with:

- Steps to reproduce the issue
- Expected vs actual behavior
- Environment details (OS, Docker version, browser)
- Relevant logs or screenshots

## Suggesting Features

Open a [feature request](../../issues/new?template=feature_request.md) describing:

- The problem you're trying to solve
- Your proposed solution
- Any alternatives you considered

## Development Workflow

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/your-username/family-finance.git`
3. **Create a branch**: `git checkout -b feat/your-feature` or `fix/your-bugfix`
4. **Make your changes** (see code style below)
5. **Test** your changes: `pytest tests/ -v` (backend) and `npx tsc --noEmit` (frontend)
6. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: add budget tracking page`
   - `fix: correct date parsing for OFX files`
   - `docs: update API endpoint table`
   - `refactor: extract transaction service`
7. **Push** and open a Pull Request against `main`

## Code Style

### Python (Backend)

- Python 3.12 with modern type hints (`X | None`, not `Optional[X]`)
- `from __future__ import annotations` in all files
- Format and lint with **ruff** (line-length 100, rules: E, F, I, UP)
- SQLAlchemy 2.0 style (`mapped_column`, `select()`)
- Pydantic V2 with `model_config = {"from_attributes": True}`

Run before committing:

```bash
cd backend
ruff check app/ --fix
ruff format app/
```

### TypeScript (Frontend)

- Strict TypeScript, no `any`
- TanStack Query for server state, Zustand for client state
- Tailwind CSS only (no CSS files)
- `interface` for object shapes, `type` for unions/intersections

Run before committing:

```bash
cd frontend
npx tsc --noEmit
```

### Database

- UUID primary keys with `created_at`/`updated_at` timestamps
- All monetary amounts stored as integers (cents)
- Schema changes via Alembic migrations only

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include tests for new functionality
- Update documentation if you change API behavior
- Ensure CI passes before requesting review
- Fill out the PR template completely

## Getting Help

If you get stuck, open a [discussion](../../discussions) or comment on the relevant issue. We're happy to help!
