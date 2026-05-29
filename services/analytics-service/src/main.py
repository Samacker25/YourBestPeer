import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from src.config import settings
from src.consumers import ai_events, expense_events, habit_events, task_events, user_events
from src.database import engine
from src.routers import metrics


@asynccontextmanager
async def lifespan(app: FastAPI):
    # One background task per stream — each runs its own XREADGROUP loop.
    # All share the same asyncio event loop as the FastAPI request handlers.
    tasks = [
        asyncio.create_task(habit_events.run()),
        asyncio.create_task(expense_events.run()),
        asyncio.create_task(task_events.run()),
        asyncio.create_task(user_events.run()),
        asyncio.create_task(ai_events.run()),
    ]
    yield
    for t in tasks:
        t.cancel()
    await engine.dispose()


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Analytics Service",
    description="Life metrics aggregation, AI-generated insights, and trend analysis",
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

app.include_router(metrics.router, prefix="/metrics", tags=["metrics"])


@app.get("/health")
async def health() -> dict:
    return {"status": "healthy", "service": "analytics-service"}
