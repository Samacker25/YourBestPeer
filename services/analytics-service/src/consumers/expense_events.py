import asyncio

import redis.asyncio as aioredis

from src.config import settings

STREAM = "expense_events"
GROUP = "analytics"
CONSUMER = "analytics-service-1"


async def _ensure_group(r: aioredis.Redis) -> None:
    try:
        await r.xgroup_create(STREAM, GROUP, id="$", mkstream=True)
    except Exception:
        pass


async def _handle(r: aioredis.Redis, data: dict) -> None:
    user_id = data["user_id"]
    amount = float(data.get("amount", 0))
    category = data.get("category", "")

    # Increment total spend and per-category spend in Redis hashes.
    # These power fast dashboard reads without hitting PostgreSQL on every request.
    await r.hincrbyfloat(f"analytics:finance:{user_id}", "total_spent", amount)
    await r.hincrbyfloat(f"analytics:finance:{user_id}", f"category:{category}", amount)


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
