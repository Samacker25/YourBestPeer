import asyncio
import uuid
from datetime import datetime, timezone

import redis.asyncio as aioredis
from sqlalchemy import select

from src.config import settings
from src.database import AsyncSessionLocal
from src.models.workflow import WorkflowRule
from src.routers.workflows import _execute_action

STREAM = "expense_events"
GROUP = "automation"
CONSUMER = "automation-service-1"


async def _ensure_group(r: aioredis.Redis) -> None:
    try:
        await r.xgroup_create(STREAM, GROUP, id="$", mkstream=True)
    except Exception:
        pass


async def _handle(data: dict) -> None:
    pct_raw = data.get("pct", "")
    if not pct_raw or float(pct_raw) < 100:
        # Only fire "budget_exceeded" automation rules when the budget is fully crossed.
        return

    user_id = uuid.UUID(data["user_id"])

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(WorkflowRule).where(
                WorkflowRule.user_id == user_id,
                WorkflowRule.is_active == True,
                WorkflowRule.trigger_type == "budget_exceeded",
            )
        )
        rules = result.scalars().all()

        for rule in rules:
            await _execute_action(rule, str(user_id))
            rule.run_count += 1
            rule.last_run_at = datetime.now(timezone.utc)

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
