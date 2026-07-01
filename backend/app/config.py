from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:password@localhost:5432/temirtau_volunteer",
        validation_alias="DATABASE_URL"
    )
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        validation_alias="REDIS_URL"
    )
    TELEGRAM_BOT_TOKEN: str = Field(
        default="MOCK_TELEGRAM_BOT_TOKEN_123456:ABC-def_ghi",
        validation_alias="TELEGRAM_BOT_TOKEN"
    )
    APP_ENV: str = Field(default="development", validation_alias="APP_ENV")
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
