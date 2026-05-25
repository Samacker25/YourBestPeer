from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_here = Path(__file__).parent.parent
_root = _here.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[str(_here / ".env"), str(_root / ".env")],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+asyncpg://lifeos:lifeos_dev@localhost:5432/lifeos"
    redis_url: str = "redis://localhost:6379"
    jwt_secret: str = "change_me"
    jwt_algorithm: str = "HS256"
    cors_origins: list[str] = ["http://localhost:3001"]
    environment: str = "development"
    google_api_key: str = ""
    notification_service_url: str = "http://localhost:8008"
    integrations_service_url: str = "http://localhost:8011"


settings = Settings()
