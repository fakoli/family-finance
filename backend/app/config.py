from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": "../.env", "extra": "ignore"}

    # Database
    DATABASE_URL: str = (
        "postgresql+asyncpg://familyfinance:changeme@postgres:5432/familyfinance"
    )

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # Auth
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ALGORITHM: str = "HS256"

    # AI Providers
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    DEFAULT_AI_PROVIDER: str = "claude"

    # Import automation
    IMPORT_WATCH_DIR: str = "/data/imports"
    IMPORT_DEFAULT_USER_ID: str = ""
    IMPORT_SCAN_INTERVAL_SECONDS: int = 30

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]


settings = Settings()
