"""Gmail integration — read recent messages and AI-summarize them."""
import base64
import json
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import get_current_user_id
from src.config import settings
from src.database import get_db
from src.routers.google_oauth import get_google_token

router = APIRouter()

_GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"

_SUMMARIZE_PROMPT = """Summarise these email subjects and snippets into 3-5 bullet-point insights.
Focus on action items, urgent matters, and important updates. Be extremely concise.
Return ONLY valid JSON:
{{
  "summary": "one-line overall summary",
  "action_items": ["action 1", "action 2"],
  "highlights": ["key info 1", "key info 2"],
  "unread_count": 0
}}

EMAILS:
{emails}"""


class GmailMessage(BaseModel):
    id: str
    subject: str
    from_address: str
    snippet: str
    date: str
    is_read: bool
    labels: list[str]


class GmailSummary(BaseModel):
    summary: str
    action_items: list[str]
    highlights: list[str]
    unread_count: int
    messages: list[GmailMessage]


def _decode_header(headers: list[dict], name: str) -> str:
    return next((h["value"] for h in headers if h["name"].lower() == name.lower()), "")


@router.get("/messages", response_model=GmailSummary)
async def list_messages(
    max_results: int = Query(default=10, ge=1, le=25),
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> GmailSummary:
    token = await get_google_token(user_id, db)
    if not token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Gmail not connected")

    async with httpx.AsyncClient(timeout=10.0) as client:
        # List message IDs
        list_resp = await client.get(
            f"{_GMAIL_BASE}/messages",
            headers={"Authorization": f"Bearer {token}"},
            params={"maxResults": max_results, "labelIds": "INBOX"},
        )
        if not list_resp.is_success:
            raise HTTPException(status_code=list_resp.status_code, detail="Gmail list error")

        message_ids = [m["id"] for m in list_resp.json().get("messages", [])]

        # Fetch message details in parallel (batch)
        messages: list[GmailMessage] = []
        for msg_id in message_ids:
            try:
                msg_resp = await client.get(
                    f"{_GMAIL_BASE}/messages/{msg_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    params={"format": "metadata", "metadataHeaders": ["Subject", "From", "Date"]},
                )
                if not msg_resp.is_success:
                    continue
                msg = msg_resp.json()
                headers = msg.get("payload", {}).get("headers", [])
                labels = msg.get("labelIds", [])

                messages.append(GmailMessage(
                    id=msg_id,
                    subject=_decode_header(headers, "Subject") or "(no subject)",
                    from_address=_decode_header(headers, "From"),
                    snippet=msg.get("snippet", ""),
                    date=_decode_header(headers, "Date"),
                    is_read="UNREAD" not in labels,
                    labels=labels,
                ))
            except Exception:
                continue

    unread = sum(1 for m in messages if not m.is_read)

    # AI summary using Gemini
    summary_data = {"summary": f"{len(messages)} recent emails, {unread} unread",
                    "action_items": [], "highlights": [], "unread_count": unread}

    if settings.google_api_key and messages:
        email_text = "\n".join(
            f"- From: {m.from_address} | Subject: {m.subject} | {m.snippet[:100]}"
            for m in messages[:8]
        )
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            from langchain_core.messages import HumanMessage
            llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=settings.google_api_key, temperature=0.3)
            prompt = _SUMMARIZE_PROMPT.format(emails=email_text)
            resp = await llm.ainvoke([HumanMessage(content=prompt)])
            raw = resp.content.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            data = json.loads(raw)
            summary_data = {**data, "unread_count": unread}
        except Exception:
            pass

    return GmailSummary(messages=messages, **summary_data)


@router.post("/messages/{message_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    message_id: str,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    token = await get_google_token(user_id, db)
    if not token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Gmail not connected")
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{_GMAIL_BASE}/messages/{message_id}/modify",
            headers={"Authorization": f"Bearer {token}"},
            json={"removeLabelIds": ["UNREAD"]},
        )
