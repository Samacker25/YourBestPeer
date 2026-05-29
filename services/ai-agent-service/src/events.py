import redis.asyncio as aioredis

from src.config import settings

AI_EVENTS_STREAM = "ai_events"


async def publish_chat_completed(
    user_id: str,
    conversation_id: str,
    reply_preview: str,
) -> None:
    # reply_preview: first 200 chars of the AI reply so consumers
    # can decide if it's worth indexing without fetching the full conversation.
    r = aioredis.from_url(settings.redis_url, decode_responses=True)
    try:
        await r.xadd(
            AI_EVENTS_STREAM,
            {
                "user_id": user_id,
                "conversation_id": conversation_id,
                "reply_preview": reply_preview[:200],
            },
        )
    finally:
        await r.aclose()
