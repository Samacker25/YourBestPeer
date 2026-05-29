import asyncio

import redis.asyncio as aioredis

from src.config import settings

# ── Redis Streams consumer — Analytics Service ──────────────────────────────
#
# Concept map (for interviews):
#   Stream      = persistent ordered log, like a Kafka topic
#   Consumer Group = a named subscription; each group gets ALL messages
#                    independently (analytics, recommendations, notifications
#                    each see every event without interfering with each other)
#   Consumer    = a worker within the group (can scale horizontally)
#   XREADGROUP  = "give me messages not yet delivered to my group"
#   XACK        = "I processed this message, remove it from my PEL"
#   PEL         = Pending Entry List — messages delivered but not yet ACK'd
#                 (allows retry on crash)
# ─────────────────────────────────────────────────────────────────────────────

STREAM = "habit_events"
GROUP = "analytics"
CONSUMER = "analytics-service-1"


async def _ensure_group(r: aioredis.Redis) -> None:
    # XGROUP CREATE creates the consumer group on the stream.
    # id='$' means: start reading from NOW (don't replay old messages).
    # mkstream=True auto-creates the stream if it doesn't exist yet.
    try:
        await r.xgroup_create(STREAM, GROUP, id="$", mkstream=True)
    except Exception:
        pass  # BUSYGROUP error — group already exists, safe to ignore


async def _handle(r: aioredis.Redis, data: dict) -> None:
    user_id = data["user_id"]
    habit_id = data["habit_id"]
    streak = int(data.get("streak", 0))

    # Store aggregated metrics in Redis hashes for fast dashboard reads.
    # hincrby atomically increments the total_completions counter.
    await r.hincrby(f"analytics:habits:{user_id}", "total_completions", 1)
    # hset overwrites the streak value for this habit with the latest reading.
    await r.hset(f"analytics:habits:{user_id}", f"streak:{habit_id}", streak)


async def run() -> None:
    r = aioredis.from_url(settings.redis_url, decode_responses=True)
    await _ensure_group(r)

    while True:
        try:
            # XREADGROUP reads messages from the stream assigned to our consumer group.
            # streams={STREAM: ">"} — '>' is a special ID meaning
            #   "only messages not yet delivered to any consumer in this group".
            # block=2000 — wait up to 2 s for new messages before returning None
            #   (keeps the loop CPU-idle instead of busy-spinning).
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
                        # XACK removes the message from the PEL — tells Redis
                        # this consumer finished processing it successfully.
                        await r.xack(STREAM, GROUP, msg_id)
                    except Exception:
                        # Leave message in PEL — a separate recovery loop
                        # (XPENDING / XCLAIM) can retry it later.
                        pass

        except Exception:
            await asyncio.sleep(1)
