import redis.asyncio as aioredis

from src.config import settings

TASK_EVENTS_STREAM = "task_events"


async def publish_task_completed(
    user_id: str,
    task_id: str,
    task_title: str,
    priority: str,
) -> None:
    r = aioredis.from_url(settings.redis_url, decode_responses=True)
    try:
        await r.xadd(
            TASK_EVENTS_STREAM,
            {
                "user_id": user_id,
                "task_id": task_id,
                "task_title": task_title,
                "priority": priority,
            },
        )
    finally:
        await r.aclose()
