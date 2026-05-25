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
    jwt_secret: str = "change_me"
    jwt_algorithm: str = "HS256"
    cors_origins: list[str] = ["http://localhost:3001"]
    environment: str = "development"
    google_api_key: str = ""

    # Google OAuth2 credentials (same app as auth-service)
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8011/integrations/google/callback"

    # Frontend URL to redirect after OAuth
    frontend_url: str = "http://localhost:3001"


settings = Settings()
