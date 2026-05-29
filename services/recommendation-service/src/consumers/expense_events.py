import asyncio
import uuid

import redis.asyncio as aioredis

from src.config import settings
from src.database import AsyncSessionLocal
from src.models.recommendation import Recommendation, RecommendationCategory

STREAM = "expense_events"
GROUP = "recommendations"
CONSUMER = "recommendation-service-1"


async def _ensure_group(r: aioredis.Redis) -> None:
    try:
        await r.xgroup_create(STREAM, GROUP, id="$", mkstream=True)
    except Exception:
        pass


async def _handle(data: dict) -> None:
    pct_raw = data.get("pct", "")
    if not pct_raw:
        return  # no budget for this category — nothing to recommend

    pct = float(pct_raw)
    if pct < 90:
        return  # only generate insight when approaching or past the limit

    user_id = data["user_id"]
    category = data.get("category", "this category")
    budget_limit = data.get("budget_limit", "your budget")
    period = data.get("period", "period")

    if pct >= 100:
        title = f"Budget exceeded: {category}"
        description = (
            f"You've used {pct:.0f}% of your {period} budget for {category}. "
            f"Consider deferring non-essential {category.lower()} spend until next {period}."
        )
    else:
        title = f"Approaching budget limit: {category}"
        description = (
            f"You've used {pct:.0f}% of your {period} budget for {category}. "
            f"You have ₹{float(budget_limit) * (1 - pct / 100):.0f} remaining."
        )

    async with AsyncSessionLocal() as db:
        rec = Recommendation(
            user_id=uuid.UUID(user_id),
            category=RecommendationCategory.finance,
            title=title,
            description=description,
            reason=f"{pct:.0f}% of {period} {category} budget consumed.",
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
