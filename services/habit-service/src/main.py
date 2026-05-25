from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from src.config import settings
from src.database import Base, engine
from src.models import Habit, HabitLog  # noqa: F401
from src.models.mood_log import MoodLog  # noqa: F401
from src.routers import habits
from src.routers import mood


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Habit Service",
    description="Daily habits, streaks, XP gamification, and wellness tracking",
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

app.include_router(habits.router, prefix="/habits", tags=["habits"])
app.include_router(mood.router, prefix="/mood", tags=["mood"])


@app.get("/health")
async def health() -> dict:
    return {"status": "healthy", "service": "habit-service"}
