import uuid
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import get_current_user_id
from src.database import get_db
from src.models.budget import Budget, BudgetPeriod
from src.models.expense import Expense

router = APIRouter()


class BudgetCreate(BaseModel):
    category: str
    limit_amount: float
    period: BudgetPeriod = BudgetPeriod.monthly


class BudgetUpdate(BaseModel):
    category: str | None = None
    limit_amount: float | None = None
    period: BudgetPeriod | None = None


class BudgetResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    category: str
    limit_amount: float
    period: BudgetPeriod
    spent: float = 0.0
    remaining: float = 0.0
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[BudgetResponse])
async def list_budgets(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[BudgetResponse]:
    result = await db.execute(select(Budget).where(Budget.user_id == user_id))
    budgets = result.scalars().all()
    responses = []
    today = date.today()
    for b in budgets:
        if b.period == BudgetPeriod.monthly:
            from_date = today.replace(day=1)
        elif b.period == BudgetPeriod.weekly:
            from_date = today - __import__("datetime").timedelta(days=today.weekday())
        else:
            from_date = today.replace(month=1, day=1)
        spent_result = await db.execute(
            select(Expense).where(
                Expense.user_id == user_id,
                Expense.category == b.category,
                Expense.date >= from_date,
            )
        )
        spent = float(sum(e.amount for e in spent_result.scalars().all()))
        r = BudgetResponse.model_validate(b)
        r.spent = spent
        r.remaining = float(b.limit_amount) - spent
        responses.append(r)
    return responses


@router.post("/", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
async def create_budget(
    body: BudgetCreate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> BudgetResponse:
    budget = Budget(user_id=user_id, **body.model_dump())
    db.add(budget)
    await db.flush()
    r = BudgetResponse.model_validate(budget)
    return r


@router.patch("/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: uuid.UUID,
    body: BudgetUpdate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> BudgetResponse:
    result = await db.execute(
        select(Budget).where(Budget.id == budget_id, Budget.user_id == user_id)
    )
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(budget, field, value)
    await db.flush()
    return BudgetResponse.model_validate(budget)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    budget_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Budget).where(Budget.id == budget_id, Budget.user_id == user_id)
    )
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
    await db.delete(budget)
