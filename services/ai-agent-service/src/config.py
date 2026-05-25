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

    pinecone_api_key: str = ""
    pinecone_environment: str = "us-east-1-aws"
    pinecone_index_name: str = "lifeos"

    google_api_key: str = ""
    llm_model: str = "gemini-2.5-flash"
    embedding_model: str = "all-MiniLM-L6-v2"

    tavily_api_key: str = ""

    langchain_tracing_v2: str = "false"
    langchain_api_key: str = ""
    langchain_project: str = "yourbestpeer"
    langchain_endpoint: str = "https://api.smith.langchain.com"

    productivity_service_url: str = "http://localhost:8003"
    habit_service_url: str = "http://localhost:8005"
    finance_service_url: str = "http://localhost:8004"
    rag_service_url: str = "http://localhost:8009"
    career_service_url: str = "http://localhost:8010"

    cors_origins: list[str] = ["http://localhost:3001"]
    environment: str = "development"


settings = Settings()
