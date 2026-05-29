import asyncio
import uuid

import redis.asyncio as aioredis

from src.config import settings
from src.database import AsyncSessionLocal
from src.models.notification import Notification, NotificationType

STREAM = "user_events"
GROUP = "notifications"
CONSUMER = "notification-service-1"


async def _ensure_group(r: aioredis.Redis) -> None:
    try:
        await r.xgroup_create(STREAM, GROUP, id="$", mkstream=True)
    except Exception:
        pass


async def _handle(data: dict) -> None:
    user_id = data["user_id"]
    name = data.get("name", "there")
    first_name = name.split()[0] if name else "there"

    async with AsyncSessionLocal() as db:
        notif = Notification(
            user_id=uuid.UUID(user_id),
            type=NotificationType.in_app,
            title=f"Welcome to YourBestPeer, {first_name}!",
            body=(
                "Your personal AI life OS is ready. "
                "Start by adding a habit, setting a budget, or just chatting with your AI coach."
            ),
            is_read=False,
        )
        db.add(notif)
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
