"""Google Calendar integration — read events and create events from tasks."""
import uuid
from datetime import date, datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import get_current_user_id
from src.database import get_db
from src.routers.google_oauth import get_google_token

router = APIRouter()

_CALENDAR_BASE = "https://www.googleapis.com/calendar/v3"


class CalendarEvent(BaseModel):
    id: str
    title: str
    start: str
    end: str
    all_day: bool
    description: str | None = None
    location: str | None = None
    calendar: str = "primary"
    color: str = "#6366f1"


class CreateEventRequest(BaseModel):
    title: str
    start: datetime
    end: datetime
    description: str | None = None
    location: str | None = None


def _parse_event(e: dict) -> CalendarEvent:
    start_raw = e.get("start", {})
    end_raw = e.get("end", {})
    all_day = "date" in start_raw and "dateTime" not in start_raw

    start = start_raw.get("dateTime") or start_raw.get("date", "")
    end = end_raw.get("dateTime") or end_raw.get("date", "")

    color_map = {
        "1": "#ef4444", "2": "#10b981", "3": "#6366f1", "4": "#f59e0b",
        "5": "#ec4899", "6": "#f97316", "7": "#06b6d4", "8": "#8b5cf6",
        "9": "#64748b", "10": "#10b981", "11": "#6366f1",
    }
    color = color_map.get(e.get("colorId", ""), "#6366f1")

    return CalendarEvent(
        id=e.get("id", ""),
        title=e.get("summary", "Untitled"),
        start=start,
        end=end,
        all_day=all_day,
        description=e.get("description"),
        location=e.get("location"),
        color=color,
    )


@router.get("/events", response_model=list[CalendarEvent])
async def list_events(
    days: int = Query(default=14, ge=1, le=90),
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[CalendarEvent]:
    token = await get_google_token(user_id, db)
    if not token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Google Calendar not connected")

    now = datetime.now(timezone.utc)
    time_min = now.isoformat()
    time_max = (now + timedelta(days=days)).isoformat()

    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{_CALENDAR_BASE}/calendars/primary/events",
            headers={"Authorization": f"Bearer {token}"},
            params={
                "timeMin": time_min,
                "timeMax": time_max,
                "singleEvents": "true",
                "orderBy": "startTime",
                "maxResults": 50,
            },
        )
        if not r.is_success:
            raise HTTPException(status_code=r.status_code, detail="Google Calendar error")
        items = r.json().get("items", [])

    return [_parse_event(e) for e in items]


@router.post("/events", response_model=CalendarEvent, status_code=status.HTTP_201_CREATED)
async def create_event(
    body: CreateEventRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> CalendarEvent:
    token = await get_google_token(user_id, db)
    if not token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Google Calendar not connected")

    event_body = {
        "summary": body.title,
        "start": {"dateTime": body.start.isoformat(), "timeZone": "UTC"},
        "end": {"dateTime": body.end.isoformat(), "timeZone": "UTC"},
    }
    if body.description:
        event_body["description"] = body.description
    if body.location:
        event_body["location"] = body.location

    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{_CALENDAR_BASE}/calendars/primary/events",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=event_body,
        )
        if not r.is_success:
            raise HTTPException(status_code=r.status_code, detail="Failed to create event")
        return _parse_event(r.json())


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: str,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    token = await get_google_token(user_id, db)
    if not token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Google Calendar not connected")
    async with httpx.AsyncClient() as client:
        await client.delete(
            f"{_CALENDAR_BASE}/calendars/primary/events/{event_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
