from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from src.config import settings
from src.database import Base, engine
from src.models.integration import GoogleIntegration  # noqa: F401
from src.routers import calendar, gmail, google_oauth

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="Integrations Service",
    description="Google Calendar, Gmail, and third-party integrations for AI Life OS",
    version="0.1.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(google_oauth.router, prefix="/integrations", tags=["oauth"])
app.include_router(calendar.router, prefix="/integrations/calendar", tags=["calendar"])
app.include_router(gmail.router, prefix="/integrations/gmail", tags=["gmail"])


@app.get("/health")
async def health() -> dict:
    return {"status": "healthy", "service": "integrations-service"}
