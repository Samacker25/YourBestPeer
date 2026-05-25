import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import get_current_user_id
from src.config import settings
from src.database import get_db
from src.models.workflow import WorkflowRule

router = APIRouter()


class WorkflowCreate(BaseModel):
    name: str
    is_active: bool = True
    trigger_type: str
    trigger_config: dict = {}
    action_type: str
    action_config: dict = {}


class WorkflowPatch(BaseModel):
    is_active: bool


class WorkflowOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    is_active: bool
    trigger_type: str
    trigger_config: dict
    action_type: str
    action_config: dict
    run_count: int
    last_run_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[WorkflowOut])
async def list_workflows(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WorkflowRule)
        .where(WorkflowRule.user_id == user_id)
        .order_by(WorkflowRule.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=WorkflowOut, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    body: WorkflowCreate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    rule = WorkflowRule(
        user_id=user_id,
        name=body.name,
        is_active=body.is_active,
        trigger_type=body.trigger_type,
        trigger_config=body.trigger_config,
        action_type=body.action_type,
        action_config=body.action_config,
    )
    db.add(rule)
    await db.flush()
    await db.refresh(rule)
    return rule


@router.patch("/{rule_id}", response_model=WorkflowOut)
async def toggle_workflow(
    rule_id: uuid.UUID,
    body: WorkflowPatch,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    rule = await _get_rule(db, rule_id, user_id)
    rule.is_active = body.is_active
    await db.flush()
    await db.refresh(rule)
    return rule


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    rule_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    rule = await _get_rule(db, rule_id, user_id)
    await db.delete(rule)


@router.post("/{rule_id}/run")
async def run_workflow(
    rule_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    rule = await _get_rule(db, rule_id, user_id)
    if not rule.is_active:
        raise HTTPException(status_code=400, detail="Workflow is disabled")

    triggered, message = await _execute_action(rule, str(user_id))

    rule.run_count += 1
    rule.last_run_at = datetime.now(timezone.utc)
    await db.flush()

    return {"triggered": triggered, "message": message}


async def _get_rule(db: AsyncSession, rule_id: uuid.UUID, user_id: uuid.UUID) -> WorkflowRule:
    result = await db.execute(
        select(WorkflowRule).where(
            WorkflowRule.id == rule_id, WorkflowRule.user_id == user_id
        )
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return rule


async def _execute_action(rule: WorkflowRule, user_id: str) -> tuple[bool, str]:
    cfg = rule.action_config
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            if rule.action_type == "send_notification":
                payload = {
                    "user_id": user_id,
                    "channel": cfg.get("channel", "in_app"),
                    "title": cfg.get("title", rule.name),
                    "body": cfg.get("body", f"Workflow '{rule.name}' triggered"),
                }
                r = await client.post(
                    f"{settings.notification_service_url}/notifications/send",
                    json=payload,
                )
                return r.is_success, "Notification sent" if r.is_success else f"Notification failed: {r.status_code}"

            elif rule.action_type == "create_task":
                payload = {
                    "title": cfg.get("title", f"Task from {rule.name}"),
                    "description": cfg.get("description", ""),
                    "priority": cfg.get("priority", "medium"),
                    "status": "todo",
                }
                r = await client.post(
                    f"{settings.productivity_service_url}/tasks/",
                    json=payload,
                    headers={"X-User-Id": user_id},
                )
                return r.is_success, "Task created" if r.is_success else f"Task creation failed: {r.status_code}"

            elif rule.action_type == "log_habit":
                habit_id = cfg.get("habit_id")
                if not habit_id:
                    return False, "No habit_id in action_config"
                r = await client.post(
                    f"{settings.habit_service_url}/habits/{habit_id}/log",
                    json={"notes": cfg.get("notes", "")},
                    headers={"X-User-Id": user_id},
                )
                return r.is_success, "Habit logged" if r.is_success else f"Habit log failed: {r.status_code}"

            elif rule.action_type == "webhook":
                url = cfg.get("url")
                if not url:
                    return False, "No URL in action_config"
                r = await client.post(url, json={"workflow": rule.name, "user_id": user_id})
                return r.is_success, f"Webhook responded {r.status_code}"

            else:
                return False, f"Unknown action_type: {rule.action_type}"

    except Exception as e:
        return False, f"Execution error: {e}"
