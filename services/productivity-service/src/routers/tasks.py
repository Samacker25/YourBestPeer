import json
import uuid
from datetime import date, datetime, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import get_current_user_id
from src.config import settings
from src.database import get_db
from src.models.task import Task, TaskPriority, TaskStatus

router = APIRouter()


async def _notify(user_id: str, title: str, body: str) -> None:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            await client.post(
                f"{settings.notification_service_url}/notifications/",
                json={"user_id": user_id, "title": title, "body": body, "type": "in_app"},
            )
    except Exception:
        pass


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    status: TaskStatus = TaskStatus.todo
    priority: TaskPriority = TaskPriority.medium
    due_date: date | None = None
    project_id: uuid.UUID | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    due_date: date | None = None
    project_id: uuid.UUID | None = None


class TaskResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    project_id: uuid.UUID | None
    title: str
    description: str | None
    status: TaskStatus
    priority: TaskPriority
    due_date: date | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[TaskResponse])
async def list_tasks(
    status: TaskStatus | None = None,
    priority: TaskPriority | None = None,
    project_id: uuid.UUID | None = None,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[TaskResponse]:
    query = select(Task).where(Task.user_id == user_id)
    if status:
        query = query.where(Task.status == status)
    if priority:
        query = query.where(Task.priority == priority)
    if project_id:
        query = query.where(Task.project_id == project_id)
    result = await db.execute(query.order_by(Task.created_at.desc()))
    return [TaskResponse.model_validate(t) for t in result.scalars().all()]


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    body: TaskCreate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> TaskResponse:
    task = Task(user_id=user_id, **body.model_dump())
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return TaskResponse.model_validate(task)


_SCHEDULE_PROMPT = """You are a smart scheduling assistant. Given a list of pending tasks and existing calendar events, suggest the best time slots for each task.

Today: {today}
Working hours: 9:00 AM – 7:00 PM IST

Pending tasks (JSON):
{tasks_json}

Existing calendar events for the next 7 days (JSON):
{events_json}

Rules:
- Avoid scheduling during existing calendar events
- Schedule high-priority tasks earlier in the day/week
- Respect due dates — schedule tasks before their due date
- Keep tasks to 1–2 hour blocks
- Do NOT schedule on weekends unless a task is due then
- Only suggest up to 8 slots total

Return ONLY valid JSON — no markdown, no explanation — as an array:
[
  {{
    "task_id": "uuid",
    "task_title": "string",
    "suggested_start": "ISO8601 datetime",
    "suggested_end": "ISO8601 datetime",
    "reason": "one-sentence reason"
  }}
]"""


class ScheduleSuggestion(BaseModel):
    task_id: str
    task_title: str
    suggested_start: str
    suggested_end: str
    reason: str


@router.post("/schedule", response_model=list[ScheduleSuggestion])
async def schedule_tasks(
    request: Request,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[ScheduleSuggestion]:
    result = await db.execute(
        select(Task).where(
            Task.user_id == user_id,
            Task.status.in_([TaskStatus.todo, TaskStatus.in_progress]),
        ).order_by(Task.due_date.asc().nulls_last(), Task.created_at.asc())
    )
    tasks = result.scalars().all()[:15]

    if not tasks:
        return []

    auth_header = request.headers.get("Authorization", "")
    calendar_events: list[dict] = []
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"{settings.integrations_service_url}/integrations/calendar/events?days=7",
                headers={"Authorization": auth_header},
            )
            if resp.status_code == 200:
                calendar_events = resp.json()
    except Exception:
        pass

    tasks_data = [
        {
            "id": str(t.id),
            "title": t.title,
            "priority": t.priority.value if hasattr(t.priority, "value") else t.priority,
            "due_date": t.due_date.isoformat() if t.due_date else None,
        }
        for t in tasks
    ]

    if not settings.google_api_key:
        return _fallback_schedule(tasks_data)

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.messages import HumanMessage
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=settings.google_api_key, temperature=0.3)
        prompt = _SCHEDULE_PROMPT.format(
            today=date.today().isoformat(),
            tasks_json=json.dumps(tasks_data, indent=2),
            events_json=json.dumps(calendar_events[:20], indent=2),
        )
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        raw = response.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        suggestions = json.loads(raw)
        return [ScheduleSuggestion(**s) for s in suggestions]
    except Exception:
        return _fallback_schedule(tasks_data)


def _fallback_schedule(tasks: list[dict]) -> list[ScheduleSuggestion]:
    suggestions: list[ScheduleSuggestion] = []
    base = date.today() + timedelta(days=1)
    # skip weekends
    while base.weekday() >= 5:
        base += timedelta(days=1)

    slots = [(9, 10), (10, 11), (14, 15), (15, 16), (11, 12), (16, 17), (9, 10), (10, 11)]
    day_offsets = [0, 0, 0, 0, 1, 1, 2, 2]

    for i, task in enumerate(tasks[:8]):
        h_start, h_end = slots[i]
        day = base + timedelta(days=day_offsets[i])
        while day.weekday() >= 5:
            day += timedelta(days=1)
        suggestions.append(
            ScheduleSuggestion(
                task_id=task["id"],
                task_title=task["title"],
                suggested_start=f"{day.isoformat()}T{h_start:02d}:00:00",
                suggested_end=f"{day.isoformat()}T{h_end:02d}:00:00",
                reason=f"Scheduled in a free slot based on priority",
            )
        )
    return suggestions


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> TaskResponse:
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.user_id == user_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return TaskResponse.model_validate(task)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: uuid.UUID,
    body: TaskUpdate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> TaskResponse:
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.user_id == user_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    was_done = task.status == TaskStatus.done
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(task, field, value)
    await db.flush()

    if not was_done and task.status == TaskStatus.done:
        await _notify(
            str(user_id),
            f"✅ Task completed: \"{task.title}\"",
            "Great work! You completed a task.",
        )

    return TaskResponse.model_validate(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.user_id == user_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    await db.delete(task)
