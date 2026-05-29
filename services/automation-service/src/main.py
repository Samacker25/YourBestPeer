import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from src.config import settings
from src.consumers import expense_events
from src.database import Base, engine
from src.models import WorkflowRule  # noqa: F401
from src.routers import workflows


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    tasks = [
        asyncio.create_task(expense_events.run()),
    ]
    yield
    for t in tasks:
        t.cancel()
    await engine.dispose()


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Automation Service",
    description="Workflow rules engine — triggers, conditions, and automated actions",
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

app.include_router(workflows.router, prefix="/workflows", tags=["workflows"])


@app.get("/health")
async def health() -> dict:
    return {"status": "healthy", "service": "automation-service"}
