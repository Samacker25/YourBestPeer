import asyncio
import uuid

import redis.asyncio as aioredis

from src.config import settings
from src.database import AsyncSessionLocal
from src.models.notification import Notification, NotificationType

STREAM = "task_events"
GROUP = "notifications"
CONSUMER = "notification-service-1"


async def _ensure_group(r: aioredis.Redis) -> None:
    try:
        await r.xgroup_create(STREAM, GROUP, id="$", mkstream=True)
    except Exception:
        pass


async def _handle(data: dict) -> None:
    user_id = data["user_id"]
    task_title = data.get("task_title", "a task")
    priority = data.get("priority", "medium")

    # Only send a notification for high-priority completions to avoid noise.
    if priority != "high":
        return

    async with AsyncSessionLocal() as db:
        notif = Notification(
            user_id=uuid.UUID(user_id),
            type=NotificationType.in_app,
            title=f'High-priority task done: "{task_title}"',
            body="Great execution on a critical task. What's next on your list?",
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
