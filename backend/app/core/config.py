from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "OMNI"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Gemini API Settings
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Claude API Settings (Anthropic)
    CLAUDE_API_KEY: Optional[str] = None
    CLAUDE_MODEL: str = "claude-3-5-sonnet-20241022"

    # Pinduoduo (拼多多) Sourcing API Settings
    PDD_CLIENT_ID: Optional[str] = None
    PDD_CLIENT_SECRET: Optional[str] = None
    PROVIDER_PDD_BASE_URL: Optional[str] = None
    PROVIDER_PDD_API_KEY: Optional[str] = None

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./test.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Auth
    JWT_SECRET_KEY: str = "sourceiq_super_secret_jwt_key_32bytes_min"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
