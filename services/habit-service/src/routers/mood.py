import uuid
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import get_current_user_id
from src.database import get_db
from src.models.mood_log import MoodLog

router = APIRouter()

_MOOD_EMOJIS = {1: "😔", 2: "😕", 3: "🙂", 4: "😊", 5: "🤩"}


class MoodCreate(BaseModel):
    mood: int = Field(..., ge=1, le=5)
    energy: int = Field(..., ge=1, le=5)
    sleep_hours: int | None = Field(None, ge=0, le=24)
    note: str | None = None
    log_date: date = Field(default_factory=date.today)


class MoodOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    log_date: date
    mood: int
    energy: int
    sleep_hours: int | None
    note: str | None
    emoji: str
    created_at: datetime

    model_config = {"from_attributes": True}


@router.post("/", response_model=MoodOut, status_code=status.HTTP_201_CREATED)
async def log_mood(
    body: MoodCreate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> MoodOut:
    # Upsert — replace existing log for same date
    existing = await db.execute(
        select(MoodLog).where(MoodLog.user_id == user_id, MoodLog.log_date == body.log_date)
    )
    log = existing.scalar_one_or_none()
    if log:
        log.mood = body.mood
        log.energy = body.energy
        log.sleep_hours = body.sleep_hours
        log.note = body.note
        log.emoji = _MOOD_EMOJIS.get(body.mood, "🙂")
    else:
        log = MoodLog(
            user_id=user_id,
            log_date=body.log_date,
            mood=body.mood,
            energy=body.energy,
            sleep_hours=body.sleep_hours,
            note=body.note,
            emoji=_MOOD_EMOJIS.get(body.mood, "🙂"),
        )
        db.add(log)
    await db.flush()
    await db.refresh(log)
    return MoodOut.model_validate(log)


@router.get("/", response_model=list[MoodOut])
async def list_mood_logs(
    days: int = Query(default=14, ge=1, le=90),
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[MoodOut]:
    from datetime import timedelta
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(MoodLog)
        .where(MoodLog.user_id == user_id, MoodLog.log_date >= since)
        .order_by(MoodLog.log_date.desc())
    )
    return [MoodOut.model_validate(r) for r in result.scalars().all()]


@router.get("/today", response_model=MoodOut | None)
async def today_mood(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> MoodOut | None:
    result = await db.execute(
        select(MoodLog).where(MoodLog.user_id == user_id, MoodLog.log_date == date.today())
    )
    log = result.scalar_one_or_none()
    return MoodOut.model_validate(log) if log else None
