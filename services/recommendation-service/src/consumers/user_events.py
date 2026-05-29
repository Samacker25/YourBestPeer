import asyncio
import uuid

import redis.asyncio as aioredis

from src.config import settings
from src.database import AsyncSessionLocal
from src.models.recommendation import Recommendation, RecommendationCategory

STREAM = "user_events"
GROUP = "recommendations"
CONSUMER = "recommendation-service-1"

_ONBOARDING = [
    (
        RecommendationCategory.habit,
        "Start your first daily habit",
        "Research shows small daily habits compound dramatically. Start with just one — 5 minutes of reading, a quick walk, or journaling.",
        "New user onboarding",
    ),
    (
        RecommendationCategory.finance,
        "Set a monthly budget",
        "Track one spending category first — food or transport. Awareness alone reduces spend by ~15%.",
        "New user onboarding",
    ),
    (
        RecommendationCategory.task,
        "Add your top 3 priorities for this week",
        "Three focused tasks beat a long backlog. Add them now so your AI coach can help you schedule them.",
        "New user onboarding",
    ),
]


async def _ensure_group(r: aioredis.Redis) -> None:
    try:
        await r.xgroup_create(STREAM, GROUP, id="$", mkstream=True)
    except Exception:
        pass


async def _handle(data: dict) -> None:
    user_id = uuid.UUID(data["user_id"])

    async with AsyncSessionLocal() as db:
        for category, title, description, reason in _ONBOARDING:
            rec = Recommendation(
                user_id=user_id,
                category=category,
                title=title,
                description=description,
                reason=reason,
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
                        await _handle(data)
                        await r.xack(STREAM, GROUP, msg_id)
                    except Exception:
                        pass

        except Exception:
            await asyncio.sleep(1)
