import asyncio
import uuid

import redis.asyncio as aioredis

from src.config import settings
from src.database import AsyncSessionLocal
from src.models.notification import Notification, NotificationType

STREAM = "habit_events"
GROUP = "notifications"
CONSUMER = "notification-service-1"

# Encouragement messages keyed by streak milestone.
# Non-milestone completions don't generate a notification — that would be noisy.
_ENCOURAGEMENTS: dict[int, tuple[str, str]] = {
    7: ("7-day streak!", "One week straight — you're building something real. Keep going!"),
    14: ("14-day streak!", "Two weeks of consistency. That discipline compounds."),
    30: ("30-day streak!", "A full month. Most people quit by day 3. You didn't."),
    50: ("50-day streak!", "50 days of showing up. Extraordinary."),
    100: ("100-day streak!", "100 days. You've officially made this a part of who you are."),
}


async def _ensure_group(r: aioredis.Redis) -> None:
    try:
        await r.xgroup_create(STREAM, GROUP, id="$", mkstream=True)
    except Exception:
        pass


async def _handle(data: dict) -> None:
    streak = int(data.get("streak", 0))
    if streak not in _ENCOURAGEMENTS:
        return

    user_id = data["user_id"]
    habit_name = data["habit_name"]
    title, body_template = _ENCOURAGEMENTS[streak]

    async with AsyncSessionLocal() as db:
        notif = Notification(
            user_id=uuid.UUID(user_id),
            type=NotificationType.in_app,
            title=f'{title} "{habit_name}"',
            body=body_template,
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
