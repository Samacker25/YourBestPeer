import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import get_current_user_id
from src.database import get_db

router = APIRouter()


class LifeSummary(BaseModel):
    tasks_todo: int
    tasks_done_this_week: int
    habits_active: int
    habits_completed_today: int
    expenses_this_month: float
    life_score: int


class DailyExpense(BaseModel):
    date: str
    amount: float


class CategorySpend(BaseModel):
    category: str
    amount: float


class HabitStreak(BaseModel):
    name: str
    streak: int
    completion_rate: float


class TaskTrend(BaseModel):
    date: str
    completed: int


@router.get("/summary", response_model=LifeSummary)
async def get_summary(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> LifeSummary:
    from sqlalchemy import text

    today = date.today()
    month_start = today.replace(day=1)
    week_start = today.replace(day=today.day - today.weekday())

    # Tasks — count todo and done this week using raw SQL across the shared DB
    tasks_todo_result = await db.execute(
        text("SELECT COUNT(*) FROM tasks WHERE user_id = :uid AND status = 'todo'"),
        {"uid": str(user_id)},
    )
    tasks_todo = tasks_todo_result.scalar() or 0

    tasks_done_result = await db.execute(
        text(
            "SELECT COUNT(*) FROM tasks WHERE user_id = :uid AND status = 'done' AND updated_at >= :ws"
        ),
        {"uid": str(user_id), "ws": week_start},
    )
    tasks_done_week = tasks_done_result.scalar() or 0

    # Habits
    habits_result = await db.execute(
        text("SELECT COUNT(*) FROM habits WHERE user_id = :uid AND is_active = true"),
        {"uid": str(user_id)},
    )
    habits_active = habits_result.scalar() or 0

    habits_today_result = await db.execute(
        text(
            "SELECT COUNT(*) FROM habit_logs WHERE user_id = :uid AND completed_date = :today"
        ),
        {"uid": str(user_id), "today": today},
    )
    habits_completed_today = habits_today_result.scalar() or 0

    # Finance
    expenses_result = await db.execute(
        text(
            "SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE user_id = :uid AND date >= :ms"
        ),
        {"uid": str(user_id), "ms": month_start},
    )
    expenses_this_month = float(expenses_result.scalar() or 0)

    # Simple life score 0-100
    score = 50
    if habits_active > 0:
        score += min(20, int(habits_completed_today / habits_active * 20))
    if tasks_done_week > 0:
        score += min(20, tasks_done_week * 2)
    score = min(100, score)

    return LifeSummary(
        tasks_todo=int(tasks_todo),
        tasks_done_this_week=int(tasks_done_week),
        habits_active=int(habits_active),
        habits_completed_today=int(habits_completed_today),
        expenses_this_month=expenses_this_month,
        life_score=score,
    )


@router.get("/expenses/trend", response_model=list[DailyExpense])
async def expense_trend(
    days: int = 30,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[DailyExpense]:
    from sqlalchemy import text

    since = date.today() - timedelta(days=days)
    result = await db.execute(
        text(
            "SELECT date::text, COALESCE(SUM(amount), 0) AS amount "
            "FROM expenses WHERE user_id = :uid AND date >= :since "
            "GROUP BY date ORDER BY date"
        ),
        {"uid": str(user_id), "since": since},
    )
    return [DailyExpense(date=row[0], amount=float(row[1])) for row in result.fetchall()]


@router.get("/expenses/by-category", response_model=list[CategorySpend])
async def expense_by_category(
    days: int = 30,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[CategorySpend]:
    from sqlalchemy import text

    since = date.today() - timedelta(days=days)
    result = await db.execute(
        text(
            "SELECT category, COALESCE(SUM(amount), 0) AS amount "
            "FROM expenses WHERE user_id = :uid AND date >= :since "
            "GROUP BY category ORDER BY amount DESC"
        ),
        {"uid": str(user_id), "since": since},
    )
    return [CategorySpend(category=row[0], amount=float(row[1])) for row in result.fetchall()]


@router.get("/habits/stats", response_model=list[HabitStreak])
async def habit_stats(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[HabitStreak]:
    from sqlalchemy import text

    since = date.today() - timedelta(days=30)
    habits_result = await db.execute(
        text("SELECT id, name, streak FROM habits WHERE user_id = :uid AND is_active = true"),
        {"uid": str(user_id)},
    )
    habits = habits_result.fetchall()

    stats: list[HabitStreak] = []
    for habit_id, name, streak in habits:
        logs_result = await db.execute(
            text(
                "SELECT COUNT(*) FROM habit_logs WHERE habit_id = :hid AND completed_date >= :since"
            ),
            {"hid": str(habit_id), "since": since},
        )
        log_count = logs_result.scalar() or 0
        completion_rate = round(log_count / 30, 2)
        stats.append(HabitStreak(name=name, streak=streak or 0, completion_rate=completion_rate))

    return stats


@router.get("/tasks/trend", response_model=list[TaskTrend])
async def task_trend(
    days: int = 14,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[TaskTrend]:
    from sqlalchemy import text

    since = date.today() - timedelta(days=days)
    result = await db.execute(
        text(
            "SELECT updated_at::date::text, COUNT(*) "
            "FROM tasks WHERE user_id = :uid AND status = 'done' AND updated_at::date >= :since "
            "GROUP BY updated_at::date ORDER BY updated_at::date"
        ),
        {"uid": str(user_id), "since": since},
    )
    return [TaskTrend(date=row[0], completed=int(row[1])) for row in result.fetchall()]
