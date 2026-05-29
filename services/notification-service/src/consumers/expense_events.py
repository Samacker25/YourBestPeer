import asyncio
import uuid

import redis.asyncio as aioredis

from src.config import settings
from src.database import AsyncSessionLocal
from src.models.notification import Notification, NotificationType

STREAM = "expense_events"
GROUP = "notifications"
CONSUMER = "notification-service-1"


async def _ensure_group(r: aioredis.Redis) -> None:
    try:
        await r.xgroup_create(STREAM, GROUP, id="$", mkstream=True)
    except Exception:
        pass


async def _handle(data: dict) -> None:
    pct_raw = data.get("pct", "")
    if not pct_raw:
        return  # no budget set for this category

    pct = float(pct_raw)
    if pct < 80:
        return  # below alert threshold

    user_id = data["user_id"]
    category = data.get("category", "")
    budget_limit = data.get("budget_limit", "0")
    period = data.get("period", "")
    spent = float(data.get("amount", 0))

    if pct >= 100:
        title = f"Budget exceeded: {category}"
        body = f"You've used {pct:.0f}% of your ₹{float(budget_limit):.0f} {period} budget."
    else:
        title = f"Budget alert: {category} at {pct:.0f}%"
        body = f"You've used {pct:.0f}% of your ₹{float(budget_limit):.0f} {period} budget."

    async with AsyncSessionLocal() as db:
        notif = Notification(
            user_id=uuid.UUID(user_id),
            type=NotificationType.in_app,
            title=title,
            body=body,
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
