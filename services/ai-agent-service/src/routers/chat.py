import json
import os
import uuid
from datetime import date, datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import get_current_user_id
from src.config import settings
from src.database import get_db
from src.events import publish_chat_completed
from src.models.conversation import Conversation

_bearer = HTTPBearer(auto_error=False)


def _get_raw_token(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> str:
    return credentials.credentials if credentials else ""

router = APIRouter()

os.environ.setdefault("LANGCHAIN_TRACING_V2", settings.langchain_tracing_v2)
os.environ.setdefault("LANGCHAIN_API_KEY", settings.langchain_api_key)
os.environ.setdefault("LANGCHAIN_PROJECT", settings.langchain_project)
os.environ.setdefault("LANGCHAIN_ENDPOINT", settings.langchain_endpoint)


def _get_llm():
    from langchain_google_genai import ChatGoogleGenerativeAI
    return ChatGoogleGenerativeAI(
        model=settings.llm_model,
        google_api_key=settings.google_api_key,
        temperature=0.7,
    )


async def _fetch_user_context(token: str) -> str:
    """Fetch real user data from domain services to ground AI responses."""
    headers = {"Authorization": f"Bearer {token}"}
    today = date.today().isoformat()
    ctx_parts: list[str] = [f"Today is {today}."]

    async with httpx.AsyncClient(timeout=5.0) as client:
        # Tasks
        try:
            r = await client.get(f"{settings.productivity_service_url}/tasks/", headers=headers)
            if r.status_code == 200:
                tasks = r.json()
                todo = [t for t in tasks if t["status"] == "todo"]
                in_prog = [t for t in tasks if t["status"] == "in_progress"]
                done = [t for t in tasks if t["status"] == "done"]
                ctx_parts.append(
                    f"Tasks: {len(todo)} to-do, {len(in_prog)} in progress, {len(done)} done. "
                    + (f"To-do: {', '.join(t['title'] for t in todo[:5])}." if todo else "")
                )
        except Exception:
            pass

        # Habits
        try:
            r = await client.get(f"{settings.habit_service_url}/habits/", headers=headers)
            if r.status_code == 200:
                habits = r.json()
                completed = [h for h in habits if h["completed_today"]]
                pending = [h for h in habits if not h["completed_today"]]
                ctx_parts.append(
                    f"Habits today: {len(completed)}/{len(habits)} completed. "
                    + (f"Still pending: {', '.join(h['name'] for h in pending[:5])}." if pending else "All done!")
                )
        except Exception:
            pass

        # Finance
        try:
            r = await client.get(f"{settings.finance_service_url}/expenses/summary", headers=headers)
            if r.status_code == 200:
                s = r.json()
                top_cats = sorted(s.get("by_category", {}).items(), key=lambda x: -x[1])[:3]
                ctx_parts.append(
                    f"Finance: spent ₹{s['total']:.0f} total across {s['count']} expenses. "
                    + (f"Top categories: {', '.join(f'{c} ₹{a:.0f}' for c, a in top_cats)}." if top_cats else "")
                )
        except Exception:
            pass

    return " ".join(ctx_parts)


class ChatRequest(BaseModel):
    message: str
    conversation_id: uuid.UUID | None = None


class MessageOut(BaseModel):
    role: str
    content: str
    timestamp: str


class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    reply: str
    messages: list[MessageOut]


class ConversationSummary(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


@router.post("/", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    token: str = Depends(_get_raw_token),
) -> ChatResponse:
    if not settings.google_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service not configured — set GOOGLE_API_KEY",
        )

    conversation: Conversation | None = None
    if body.conversation_id:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == body.conversation_id,
                Conversation.user_id == user_id,
            )
        )
        conversation = result.scalar_one_or_none()

    if not conversation:
        conversation = Conversation(user_id=user_id, messages=[])
        db.add(conversation)
        await db.flush()

    user_context = await _fetch_user_context(token)

    now = datetime.utcnow().isoformat()
    messages: list[dict] = list(conversation.messages or [])
    messages.append({"role": "user", "content": body.message, "timestamp": now})

    from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

    system_prompt = (
        "You are YourBestPeer — a personal AI life coach embedded in the user's life management app. "
        "You have access to the user's real-time data shown below. Use it to give specific, grounded advice.\n\n"
        f"USER DATA: {user_context}\n\n"
        "Be concise, warm, and actionable. Reference the user's actual tasks, habits, and spending when relevant."
    )

    lc_messages = [SystemMessage(content=system_prompt)]
    for m in messages:
        if m["role"] == "user":
            lc_messages.append(HumanMessage(content=m["content"]))
        elif m["role"] == "assistant":
            lc_messages.append(AIMessage(content=m["content"]))

    llm = _get_llm()
    response = await llm.ainvoke(lc_messages)
    reply = str(response.content)

    reply_now = datetime.utcnow().isoformat()
    messages.append({"role": "assistant", "content": reply, "timestamp": reply_now})

    if len(messages) == 2 and conversation.title == "New conversation":
        conversation.title = body.message[:60]

    conversation.messages = messages
    await db.flush()

    await publish_chat_completed(
        user_id=str(user_id),
        conversation_id=str(conversation.id),
        reply_preview=reply,
    )

    return ChatResponse(
        conversation_id=conversation.id,
        reply=reply,
        messages=[MessageOut(**m) for m in messages],
    )


@router.post("/stream")
async def chat_stream(
    body: ChatRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    token: str = Depends(_get_raw_token),
) -> StreamingResponse:
    if not settings.google_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service not configured — set GOOGLE_API_KEY",
        )

    conversation: Conversation | None = None
    if body.conversation_id:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == body.conversation_id,
                Conversation.user_id == user_id,
            )
        )
        conversation = result.scalar_one_or_none()

    if not conversation:
        conversation = Conversation(user_id=user_id, messages=[])
        db.add(conversation)
        await db.flush()

    user_context = await _fetch_user_context(token)
    now = datetime.utcnow().isoformat()
    messages: list[dict] = list(conversation.messages or [])
    messages.append({"role": "user", "content": body.message, "timestamp": now})

    from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

    system_prompt = (
        "You are YourBestPeer — a personal AI life coach embedded in the user's life management app. "
        "You have access to the user's real-time data shown below. Use it to give specific, grounded advice.\n\n"
        f"USER DATA: {user_context}\n\n"
        "Be concise, warm, and actionable. Reference the user's actual tasks, habits, and spending when relevant."
    )

    lc_messages = [SystemMessage(content=system_prompt)]
    for m in messages:
        if m["role"] == "user":
            lc_messages.append(HumanMessage(content=m["content"]))
        elif m["role"] == "assistant":
            lc_messages.append(AIMessage(content=m["content"]))

    conv_id = str(conversation.id)

    async def event_generator():
        llm = _get_llm()
        full_reply = ""
        try:
            async for chunk in llm.astream(lc_messages):
                token_text = chunk.content if hasattr(chunk, "content") else str(chunk)
                if token_text:
                    full_reply += token_text
                    yield f"data: {json.dumps({'token': token_text})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
            return

        reply_now = datetime.utcnow().isoformat()
        messages.append({"role": "assistant", "content": full_reply, "timestamp": reply_now})

        if len(messages) == 2 and conversation.title == "New conversation":
            conversation.title = body.message[:60]

        conversation.messages = messages
        await db.flush()

        yield f"data: {json.dumps({'done': True, 'conversation_id': conv_id})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/conversations", response_model=list[ConversationSummary])
async def list_conversations(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[ConversationSummary]:
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
    )
    return [ConversationSummary.model_validate(c) for c in result.scalars().all()]


@router.get("/conversations/{conv_id}", response_model=ChatResponse)
async def get_conversation(
    conv_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ChatResponse:
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conv_id, Conversation.user_id == user_id
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return ChatResponse(
        conversation_id=conv.id,
        reply="",
        messages=[MessageOut(**m) for m in (conv.messages or [])],
    )


@router.delete("/conversations/{conv_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conv_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conv_id, Conversation.user_id == user_id
        )
    )
    conv = result.scalar_one_or_none()
    if conv:
        await db.delete(conv)
