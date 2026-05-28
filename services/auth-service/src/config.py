from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Look for .env in service dir first, then climb up to project root
_here = Path(__file__).parent.parent  # services/auth-service/
_root = _here.parent.parent  # project root


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
    jwt_access_token_expire_minutes: int = 480
    jwt_refresh_token_expire_days: int = 30

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:3001/auth/google/callback"

    cors_origins: list[str] = ["http://localhost:3001"]
    admin_key: str = "admin_dev_key"

    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""

    environment: str = "development"


settings = Settings()
