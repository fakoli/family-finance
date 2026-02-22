from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": "../.env", "extra": "ignore"}

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://familyfinance:changeme@postgres:5432/familyfinance"

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
    AI_MODEL_NAME: str = "claude-sonnet-4-5-20250929"

    # Import automation
    IMPORT_WATCH_DIR: str = "/data/imports"
    IMPORT_DEFAULT_USER_ID: str = ""
    IMPORT_SCAN_INTERVAL_SECONDS: int = 30

    # Upload limits
    MAX_UPLOAD_SIZE_BYTES: int = 50 * 1024 * 1024  # 50 MB

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]


settings = Settings()


def validate_settings() -> None:
    """Validate critical settings at startup. Call from main.py lifespan."""
    if settings.SECRET_KEY == "change-me-in-production":
        import logging

        logging.getLogger(__name__).warning(
            "SECRET_KEY is using the default value. "
            "Set a strong SECRET_KEY in .env for production deployments."
        )
