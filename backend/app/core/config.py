# ============================================================
# MineSafe AI — Application Settings
# ============================================================
# Reads all configuration from environment variables / .env file.
# Uses pydantic-settings for automatic type validation.

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Database ────────────────────────────────────────────
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/minesafe"

    # ── JWT / Auth ──────────────────────────────────────────
    SECRET_KEY: str = "change-this-secret-key-in-production-must-be-32-chars-min"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480   # 8 hours

    # ── CORS ────────────────────────────────────────────────
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # ── App ─────────────────────────────────────────────────
    APP_ENV: str = "development"
    APP_NAME: str = "MineSafe AI"
    API_V1_PREFIX: str = "/api/v1"


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance — created only once per process."""
    return Settings()


# Convenience alias used across the app
settings = get_settings()
