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
    pinecone_api_key: str = ""
    pinecone_environment: str = "us-east-1-aws"
    pinecone_index_name: str = "lifeos"
    google_api_key: str = ""
    langchain_tracing_v2: str = "false"
    langchain_api_key: str = ""
    langchain_project: str = "yourbestpeer"
    langchain_endpoint: str = "https://api.smith.langchain.com"
    cors_origins: list[str] = ["http://localhost:3001"]
    environment: str = "development"
    upload_dir: str = "uploads"


settings = Settings()
