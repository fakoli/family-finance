# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-02-09

### Added

- User authentication with JWT (register, login, profile)
- Multi-account management (checking, savings, credit cards)
- Transaction listing with filtering and search
- Category management with seed defaults
- Interactive dashboard with spending summaries and trends (Recharts)
- CSV, OFX, and QFX file import with automatic parser detection
- AI-powered transaction categorization (OpenAI and Anthropic providers)
- Natural language financial queries via AI
- Background import pipeline with Celery task chains
- Real-time import progress tracking
- File watch mode for automatic directory-based imports (Celery Beat)
- Custom parser schemas for saving bank-specific column mappings
- Admin panel with user management, system stats, and import monitoring
- CLI tools for user creation, role management, and password resets
- Plugin system for parsers, AI providers, data sources, and notifications
- Docker Compose deployment (6 services)
- Alembic database migrations (4 migrations)
- Test suite with pytest-asyncio
