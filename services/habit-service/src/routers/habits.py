import uuid
from datetime import date, datetime, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import get_current_user_id
from src.config import settings
from src.database import get_db
from src.events import publish_habit_completed
from src.models.habit import Habit, HabitFrequency
from src.models.habit_log import HabitLog

router = APIRouter()

_STREAK_MILESTONES = {7, 14, 30, 50, 100}


async def _notify(user_id: str, title: str, body: str) -> None:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            await client.post(
                f"{settings.notification_service_url}/notifications/",
                json={"user_id": user_id, "title": title, "body": body, "type": "in_app"},
            )
    except Exception:
        pass


class HabitCreate(BaseModel):
    name: str
    description: str | None = None
    frequency: HabitFrequency = HabitFrequency.daily
    target_count: int = 1
    xp_reward: int = 10
    color: str = "#6366f1"
    icon: str = "star"


class HabitUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    frequency: HabitFrequency | None = None
    target_count: int | None = None
    xp_reward: int | None = None
    color: str | None = None
    icon: str | None = None
    is_active: bool | None = None


class HabitResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: str | None
    frequency: HabitFrequency
    target_count: int
    xp_reward: int
    color: str
    icon: str
    is_active: bool
    streak: int = 0
    completed_today: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


async def _calculate_streak(habit_id: uuid.UUID, db: AsyncSession) -> int:
    result = await db.execute(
        select(HabitLog.completed_date)
        .where(HabitLog.habit_id == habit_id)
        .order_by(HabitLog.completed_date.desc())
    )
    dates = [row[0] for row in result.all()]
    if not dates:
        return 0
    streak = 0
    current = date.today()
    for d in dates:
        if d == current or d == current - timedelta(days=streak):
            streak += 1
            current = d - timedelta(days=1)
        else:
            break
    return streak


@router.get("/", response_model=list[HabitResponse])
async def list_habits(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[HabitResponse]:
    result = await db.execute(
        select(Habit).where(Habit.user_id == user_id, Habit.is_active == True)
    )
    habits = result.scalars().all()
    today = date.today()
    responses = []
    for h in habits:
        streak = await _calculate_streak(h.id, db)
        log_result = await db.execute(
            select(HabitLog).where(HabitLog.habit_id == h.id, HabitLog.completed_date == today)
        )
        completed_today = log_result.scalar_one_or_none() is not None
        r = HabitResponse.model_validate(h)
        r.streak = streak
        r.completed_today = completed_today
        responses.append(r)
    return responses


@router.post("/", response_model=HabitResponse, status_code=status.HTTP_201_CREATED)
async def create_habit(
    body: HabitCreate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> HabitResponse:
    habit = Habit(user_id=user_id, **body.model_dump())
    db.add(habit)
    await db.flush()
    await db.refresh(habit)
    r = HabitResponse.model_validate(habit)
    return r


@router.get("/{habit_id}", response_model=HabitResponse)
async def get_habit(
    habit_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> HabitResponse:
    result = await db.execute(
        select(Habit).where(Habit.id == habit_id, Habit.user_id == user_id)
    )
    habit = result.scalar_one_or_none()
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")
    streak = await _calculate_streak(habit_id, db)
    r = HabitResponse.model_validate(habit)
    r.streak = streak
    return r


@router.patch("/{habit_id}", response_model=HabitResponse)
async def update_habit(
    habit_id: uuid.UUID,
    body: HabitUpdate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> HabitResponse:
    result = await db.execute(
        select(Habit).where(Habit.id == habit_id, Habit.user_id == user_id)
    )
    habit = result.scalar_one_or_none()
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(habit, field, value)
    await db.flush()
    await db.refresh(habit)
    r = HabitResponse.model_validate(habit)
    r.streak = await _calculate_streak(habit_id, db)
    return r


@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_habit(
    habit_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Habit).where(Habit.id == habit_id, Habit.user_id == user_id)
    )
    habit = result.scalar_one_or_none()
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")
    await db.delete(habit)


@router.post("/{habit_id}/log", response_model=dict, status_code=status.HTTP_201_CREATED)
async def log_habit(
    habit_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Habit).where(Habit.id == habit_id, Habit.user_id == user_id)
    )
    habit = result.scalar_one_or_none()
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")

    today = date.today()
    existing = await db.execute(
        select(HabitLog).where(HabitLog.habit_id == habit_id, HabitLog.completed_date == today)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already logged today")

    log = HabitLog(habit_id=habit_id, user_id=user_id, completed_date=today)
    db.add(log)
    await db.flush()
    streak = await _calculate_streak(habit_id, db)

    if streak in _STREAK_MILESTONES:
        await _notify(
            str(user_id),
            f"🔥 {streak}-day streak on \"{habit.name}\"!",
            f"You've completed \"{habit.name}\" for {streak} days in a row. Keep it up!",
        )

    # Publish to Redis Stream — analytics, recommendation, and notification
    # services each consume this event independently via their own consumer groups.
    await publish_habit_completed(
        user_id=str(user_id),
        habit_id=str(habit_id),
        habit_name=habit.name,
        streak=streak,
        xp_reward=habit.xp_reward,
    )

    return {"message": "Logged!", "xp_earned": habit.xp_reward, "streak": streak}


@router.get("/xp/stats")
async def xp_stats(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> dict:
    # Fetch all active habits for the user
    habits_result = await db.execute(
        select(Habit).where(Habit.user_id == user_id, Habit.is_active == True)
    )
    habits = {h.id: h for h in habits_result.scalars().all()}

    # Count logs per habit
    logs_result = await db.execute(
        select(HabitLog.habit_id, func.count(HabitLog.id).label("log_count"))
        .where(HabitLog.user_id == user_id)
        .group_by(HabitLog.habit_id)
    )
    total_xp = 0
    total_logs = 0
    for habit_id, log_count in logs_result.all():
        total_logs += log_count
        xp_per_log = habits[habit_id].xp_reward if habit_id in habits else 10
        total_xp += xp_per_log * log_count

    # Streak across all habits
    max_streak = 0
    for habit in habits.values():
        s = await _calculate_streak(habit.id, db)
        max_streak = max(max_streak, s)

    level = total_xp // 100 + 1
    xp_in_level = total_xp % 100
    return {
        "total_xp": total_xp,
        "level": level,
        "xp_in_current_level": xp_in_level,
        "xp_to_next_level": 100 - xp_in_level,
        "total_logs": total_logs,
        "best_streak": max_streak,
    }


@router.delete("/{habit_id}/log", status_code=status.HTTP_204_NO_CONTENT)
async def unlog_habit(
    habit_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    today = date.today()
    result = await db.execute(
        select(HabitLog).where(
            HabitLog.habit_id == habit_id,
            HabitLog.user_id == user_id,
            HabitLog.completed_date == today,
        )
    )
    log = result.scalar_one_or_none()
    if log:
        await db.delete(log)
