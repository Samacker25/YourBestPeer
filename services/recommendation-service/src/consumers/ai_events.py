import asyncio
import uuid

import redis.asyncio as aioredis

from src.config import settings
from src.database import AsyncSessionLocal
from src.models.recommendation import Recommendation, RecommendationCategory

STREAM = "ai_events"
GROUP = "recommendations"
CONSUMER = "recommendation-service-1"

# Keywords in AI reply previews that suggest an actionable recommendation was given.
_ACTION_KEYWORDS = ["you should", "i suggest", "try", "consider", "recommend", "start", "stop"]


async def _ensure_group(r: aioredis.Redis) -> None:
    try:
        await r.xgroup_create(STREAM, GROUP, id="$", mkstream=True)
    except Exception:
        pass


async def _handle(data: dict) -> None:
    user_id = data["user_id"]
    reply_preview = data.get("reply_preview", "")

    # Only persist as a recommendation if the AI reply contains actionable language.
    preview_lower = reply_preview.lower()
    if not any(kw in preview_lower for kw in _ACTION_KEYWORDS):
        return

    async with AsyncSessionLocal() as db:
        rec = Recommendation(
            user_id=uuid.UUID(user_id),
            category=RecommendationCategory.wellness,
            title="AI coach insight",
            description=reply_preview[:500],
            reason="Your AI coach flagged this as an actionable suggestion.",
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
