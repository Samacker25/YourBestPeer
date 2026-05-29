import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.consumers import habit_events
from src.database import Base, engine
from src.models import Notification  # noqa: F401
from src.routers import notifications


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    task = asyncio.create_task(habit_events.run())
    yield
    task.cancel()
    await engine.dispose()


app = FastAPI(
    title="Notification Service",
    description="Email, push notifications, SMS, and Telegram delivery",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(notifications.router, prefix="/notifications", tags=["notifications"])


@app.get("/health")
async def health() -> dict:
    return {"status": "healthy", "service": "notification-service"}
