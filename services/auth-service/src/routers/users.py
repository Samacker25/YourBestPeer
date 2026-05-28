import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.database import get_db
from src.dependencies import get_current_user
from src.models.user import User

router = APIRouter()


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    avatar_url: str | None
    is_active: bool
    plan: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UpdateUserRequest(BaseModel):
    name: str | None = None
    avatar_url: str | None = None


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UpdateUserRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    if body.name is not None:
        current_user.name = body.name
    if body.avatar_url is not None:
        current_user.avatar_url = body.avatar_url
    await db.flush()
    return UserResponse.model_validate(current_user)


@router.get("/admin/list", response_model=list[UserResponse])
async def admin_list_users(
    x_admin_key: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
) -> list[UserResponse]:
    if x_admin_key != settings.admin_key:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid admin key")
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return [UserResponse.model_validate(u) for u in result.scalars().all()]
