import asyncio

import redis.asyncio as aioredis

from src.config import settings

STREAM = "user_events"
GROUP = "analytics"
CONSUMER = "analytics-service-1"


async def _ensure_group(r: aioredis.Redis) -> None:
    try:
        await r.xgroup_create(STREAM, GROUP, id="$", mkstream=True)
    except Exception:
        pass


async def _handle(r: aioredis.Redis, data: dict) -> None:
    user_id = data["user_id"]
    # Initialise all metric hashes for the new user so reads never return None.
    await r.hsetnx(f"analytics:habits:{user_id}", "total_completions", 0)
    await r.hsetnx(f"analytics:tasks:{user_id}", "total_completed", 0)
    await r.hsetnx(f"analytics:finance:{user_id}", "total_spent", 0)


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
