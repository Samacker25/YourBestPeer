import asyncio
import uuid

import redis.asyncio as aioredis

from src.config import settings
from src.database import AsyncSessionLocal
from src.models.recommendation import Recommendation, RecommendationCategory

STREAM = "habit_events"
GROUP = "recommendations"
CONSUMER = "recommendation-service-1"

# Only generate a recommendation at meaningful streak milestones,
# not on every single habit completion.
_MILESTONE_INSIGHTS: dict[int, tuple[str, str]] = {
    7: (
        "Keep the momentum!",
        "A 7-day streak is real proof of intent. Try pairing this habit with another small one.",
    ),
    14: (
        "Two weeks strong!",
        "Science says 21 days to make a habit automatic — you're two-thirds of the way there.",
    ),
    30: (
        "One month champion!",
        "30 days in, this habit is now part of your identity. Consider increasing the intensity.",
    ),
    50: (
        "Elite consistency!",
        "50-day streaks put you in the top 1% of habit trackers. What new habit do you want to build next?",
    ),
    100: (
        "Legendary!",
        "100 days rewires your brain. Habits this deep are who you are, not just what you do.",
    ),
}


async def _ensure_group(r: aioredis.Redis) -> None:
    try:
        await r.xgroup_create(STREAM, GROUP, id="$", mkstream=True)
    except Exception:
        pass


async def _handle(data: dict) -> None:
    streak = int(data.get("streak", 0))
    if streak not in _MILESTONE_INSIGHTS:
        return

    user_id = data["user_id"]
    habit_name = data["habit_name"]
    title, description = _MILESTONE_INSIGHTS[streak]

    # Each consumer group is fully independent — the recommendation-service
    # writes to its own DB table; it doesn't touch analytics or notifications.
    async with AsyncSessionLocal() as db:
        rec = Recommendation(
            user_id=uuid.UUID(user_id),
            category=RecommendationCategory.habit,
            title=title,
            description=description,
            reason=f'You just hit a {streak}-day streak on "{habit_name}".',
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
