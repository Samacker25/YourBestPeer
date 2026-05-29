import redis.asyncio as aioredis

from src.config import settings

EXPENSE_EVENTS_STREAM = "expense_events"


async def publish_expense_created(
    user_id: str,
    amount: float,
    category: str,
    pct: float | None,
    budget_limit: float | None,
    period: str | None,
) -> None:
    # pct / budget_limit / period are None when no budget exists for this category.
    # Consumers decide whether to act based on these values.
    r = aioredis.from_url(settings.redis_url, decode_responses=True)
    try:
        await r.xadd(
            EXPENSE_EVENTS_STREAM,
            {
                "user_id": user_id,
                "amount": str(amount),
                "category": category,
                "pct": str(round(pct, 1)) if pct is not None else "",
                "budget_limit": str(budget_limit) if budget_limit is not None else "",
                "period": period or "",
            },
        )
    finally:
        await r.aclose()
