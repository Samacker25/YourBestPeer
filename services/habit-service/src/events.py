import redis.asyncio as aioredis

from src.config import settings

# The stream name acts like a Kafka topic — a persistent, ordered log of events.
HABIT_EVENTS_STREAM = "habit_events"


async def publish_habit_completed(
    user_id: str,
    habit_id: str,
    habit_name: str,
    streak: int,
    xp_reward: int,
) -> None:
    # XADD appends a new message to the stream.
    # '*' tells Redis to auto-generate the message ID (format: <milliseconds>-<sequence>).
    # Each field-value pair is a column in the message — Redis Streams store flat dicts.
    r = aioredis.from_url(settings.redis_url, decode_responses=True)
    try:
        await r.xadd(
            HABIT_EVENTS_STREAM,
            {
                "user_id": user_id,
                "habit_id": habit_id,
                "habit_name": habit_name,
                "streak": str(streak),
                "xp_reward": str(xp_reward),
            },
        )
    finally:
        await r.aclose()
