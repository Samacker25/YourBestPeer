import redis.asyncio as aioredis

from src.config import settings

USER_EVENTS_STREAM = "user_events"


async def publish_user_registered(
    user_id: str,
    email: str,
    name: str,
) -> None:
    r = aioredis.from_url(settings.redis_url, decode_responses=True)
    try:
        await r.xadd(
            USER_EVENTS_STREAM,
            {
                "user_id": user_id,
                "email": email,
                "name": name,
            },
        )
    finally:
        await r.aclose()
