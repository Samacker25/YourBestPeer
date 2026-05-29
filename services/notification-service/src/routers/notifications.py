import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import get_current_user_id
from src.database import get_db
from src.models.notification import Notification, NotificationType

router = APIRouter()


def _normalize_notification_type(value: str | None) -> NotificationType:
    if value is None:
        return NotificationType.in_app
    try:
        return NotificationType(value)
    except ValueError:
        return NotificationType.in_app


async def _persist_notification(
    body,
    db: AsyncSession,
) -> Notification:
    notif = Notification(**body.model_dump())
    db.add(notif)
    await db.flush()
    return notif


class NotificationCreate(BaseModel):
    user_id: uuid.UUID
    title: str
    body: str
    type: NotificationType = NotificationType.in_app


class NotificationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    type: NotificationType
    title: str
    body: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[NotificationResponse])
async def list_notifications(
    unread_only: bool = False,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[NotificationResponse]:
    query = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        query = query.where(Notification.is_read == False)
    result = await db.execute(query.order_by(Notification.created_at.desc()))
    return [NotificationResponse.model_validate(n) for n in result.scalars().all()]


@router.post("/", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    body: NotificationCreate,
    db: AsyncSession = Depends(get_db),
) -> NotificationResponse:
    notif = await _persist_notification(body, db)
    return NotificationResponse.model_validate(notif)


@router.post("/send", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def send_notification(
    payload: dict,
    db: AsyncSession = Depends(get_db),
) -> NotificationResponse:
    notification_type = _normalize_notification_type(payload.get("type") or payload.get("channel"))
    normalized = NotificationCreate(
        user_id=payload["user_id"],
        title=payload["title"],
        body=payload["body"],
        type=notification_type,
    )
    notif = await _persist_notification(normalized, db)
    return NotificationResponse.model_validate(notif)


@router.patch("/{notif_id}/read", response_model=NotificationResponse)
async def mark_read(
    notif_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> NotificationResponse:
    result = await db.execute(
        select(Notification).where(Notification.id == notif_id, Notification.user_id == user_id)
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notif.is_read = True
    await db.flush()
    return NotificationResponse.model_validate(notif)


@router.patch("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Notification).where(Notification.user_id == user_id, Notification.is_read == False)
    )
    for notif in result.scalars().all():
        notif.is_read = True


@router.delete("/{notif_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notif_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Notification).where(Notification.id == notif_id, Notification.user_id == user_id)
    )
    notif = result.scalar_one_or_none()
    if notif:
        await db.delete(notif)
