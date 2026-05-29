import asyncio
import uuid

import redis.asyncio as aioredis

from src.config import settings
from src.database import AsyncSessionLocal
from src.models.recommendation import Recommendation, RecommendationCategory

STREAM = "task_events"
GROUP = "recommendations"
CONSUMER = "recommendation-service-1"

# Use Redis to track completion counts so we can generate milestone recommendations.
_MILESTONES = {10, 25, 50, 100}


async def _ensure_group(r: aioredis.Redis) -> None:
    try:
        await r.xgroup_create(STREAM, GROUP, id="$", mkstream=True)
    except Exception:
        pass


async def _handle(r: aioredis.Redis, data: dict) -> None:
    user_id = data["user_id"]
    priority = data.get("priority", "medium")

    count = await r.hincrby(f"recs:tasks:{user_id}", "completed", 1)

    if count not in _MILESTONES:
        return

    if priority == "high":
        description = (
            f"You've completed {count} tasks total. High-priority work keeps momentum — "
            "consider time-blocking tomorrow morning for your next critical task."
        )
    else:
        description = (
            f"You've completed {count} tasks total. "
            "Keep your task list short and focused — quality over quantity."
        )

    async with AsyncSessionLocal() as db:
        rec = Recommendation(
            user_id=uuid.UUID(user_id),
            category=RecommendationCategory.task,
            title=f"{count} tasks completed!",
            description=description,
            reason=f"Hit the {count}-task completion milestone.",
        )
        db.add(rec)
        await db.commit()


async def run() -> None:
    r = aioredis.from_url(settings.redis_url, decode_responses=True)
    await _ensure_group(r)

    while True:
        try:
            results = await r.xreadgroup(
                groupname=GROUP,
                consumername=CONSUMER,
                streams={STREAM: ">"},
                count=10,
                block=2000,
            )
            if not results:
                continue

            for _stream_name, messages in results:
                for msg_id, data in messages:
                    try:
                        await _handle(r, data)
                        await r.xack(STREAM, GROUP, msg_id)
                    except Exception:
                        pass

        except Exception:
            await asyncio.sleep(1)
