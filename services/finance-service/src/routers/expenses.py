import base64
import json
import uuid
from datetime import date as Date, datetime

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import get_current_user_id
from src.config import settings
from src.database import get_db
from src.models.budget import Budget, BudgetPeriod
from src.models.expense import Expense


async def _notify(user_id: str, title: str, body: str) -> None:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            await client.post(
                f"{settings.notification_service_url}/notifications/",
                json={"user_id": user_id, "title": title, "body": body, "type": "in_app"},
            )
    except Exception:
        pass

router = APIRouter()

_SCAN_PROMPT = """You are a receipt scanner AI. Extract all line items from this receipt or bill image.
Return ONLY valid JSON — no markdown, no explanation — in exactly this structure:
{{
  "merchant": "store or vendor name, or null",
  "date": "{today}",
  "items": [
    {{"description": "item name", "amount": 0.00, "category": "Food"}}
  ],
  "total": 0.00
}}
Rules:
- Use the date printed on the receipt if visible, otherwise use today: {today}
- Amount must be a number (no currency symbols)
- Category must be one of: Food, Transport, Shopping, Health, Entertainment, Utilities, Education, Other
- If the receipt shows a total, include it; otherwise sum the items
- Extract every individual line item, not just the total"""

_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/gif"}
_MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB


class ExpenseCreate(BaseModel):
    amount: float
    category: str
    description: str | None = None
    date: Date


class ExpenseUpdate(BaseModel):
    amount: float | None = None
    category: str | None = None
    description: str | None = None
    date: Date | None = None


class ExpenseResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    amount: float
    category: str
    description: str | None
    date: Date
    created_at: datetime

    model_config = {"from_attributes": True}


class ExpenseSummary(BaseModel):
    total: float
    by_category: dict[str, float]
    count: int


class ScannedItem(BaseModel):
    description: str
    amount: float
    category: str


class ScanResult(BaseModel):
    merchant: str | None
    date: str
    items: list[ScannedItem]
    total: float


@router.post("/scan", response_model=ScanResult)
async def scan_receipt(
    file: UploadFile = File(...),
    user_id: uuid.UUID = Depends(get_current_user_id),
) -> ScanResult:
    if not settings.google_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Vision AI not configured — set GOOGLE_API_KEY",
        )

    content_type = file.content_type or "image/jpeg"
    if content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type. Please upload a JPEG, PNG, or WebP image.",
        )

    content = await file.read()
    if len(content) > _MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image too large (max 5 MB)",
        )

    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import HumanMessage
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=settings.google_api_key, temperature=0.1)

    today = Date.today().isoformat()
    prompt = _SCAN_PROMPT.format(today=today)
    b64 = base64.b64encode(content).decode()

    try:
        response = await llm.ainvoke([HumanMessage(content=[
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:{content_type};base64,{b64}"}},
        ])])
        raw = response.content.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not parse receipt: {exc}",
        )

    items = [ScannedItem(**item) for item in data.get("items", [])]
    total = data.get("total") or sum(i.amount for i in items)

    return ScanResult(
        merchant=data.get("merchant"),
        date=data.get("date", today),
        items=items,
        total=float(total),
    )


_CATEGORIES = ["Food", "Transport", "Shopping", "Health", "Entertainment", "Utilities", "Education", "Other"]

_CATEGORIZE_PROMPT = """Given this expense description, pick the single most appropriate category.
Description: "{description}"
Amount: {amount}

Categories: Food, Transport, Shopping, Health, Entertainment, Utilities, Education, Other

Reply with ONLY the category name — nothing else."""


@router.post("/categorize")
async def categorize_expense(
    body: dict,
    user_id: uuid.UUID = Depends(get_current_user_id),
) -> dict:
    description = str(body.get("description", "")).strip()
    amount = float(body.get("amount", 0))
    if not description:
        return {"category": "Other", "confidence": "low"}

    if not settings.google_api_key:
        # Rule-based fallback
        desc_lower = description.lower()
        rules = {
            "Food": ["food", "restaurant", "cafe", "zomato", "swiggy", "lunch", "dinner", "breakfast", "coffee", "tea", "grocery", "groceries", "snack"],
            "Transport": ["uber", "ola", "taxi", "metro", "bus", "train", "petrol", "fuel", "auto", "cab", "flight", "rapido"],
            "Shopping": ["amazon", "flipkart", "clothes", "shirt", "shoes", "mall", "store", "market"],
            "Health": ["medicine", "doctor", "hospital", "pharmacy", "gym", "health", "clinic", "dental"],
            "Entertainment": ["netflix", "spotify", "movie", "cinema", "game", "concert", "ott"],
            "Utilities": ["electricity", "water", "gas", "internet", "broadband", "wifi", "phone", "mobile", "recharge"],
            "Education": ["course", "book", "tuition", "school", "college", "udemy", "coursera", "class"],
        }
        for cat, keywords in rules.items():
            if any(kw in desc_lower for kw in keywords):
                return {"category": cat, "confidence": "medium"}
        return {"category": "Other", "confidence": "low"}

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.messages import HumanMessage
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=settings.google_api_key, temperature=0)
        prompt = _CATEGORIZE_PROMPT.format(description=description, amount=amount)
        resp = await llm.ainvoke([HumanMessage(content=prompt)])
        category = resp.content.strip().split("\n")[0].strip()
        if category not in _CATEGORIES:
            category = "Other"
        return {"category": category, "confidence": "high"}
    except Exception:
        return {"category": "Other", "confidence": "low"}


@router.get("/", response_model=list[ExpenseResponse])
async def list_expenses(
    category: str | None = None,
    from_date: Date | None = None,
    to_date: Date | None = None,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[ExpenseResponse]:
    query = select(Expense).where(Expense.user_id == user_id)
    if category:
        query = query.where(Expense.category == category)
    if from_date:
        query = query.where(Expense.date >= from_date)
    if to_date:
        query = query.where(Expense.date <= to_date)
    result = await db.execute(query.order_by(Expense.date.desc()))
    return [ExpenseResponse.model_validate(e) for e in result.scalars().all()]


@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    body: ExpenseCreate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ExpenseResponse:
    expense = Expense(user_id=user_id, **body.model_dump())
    db.add(expense)
    await db.flush()

    # Check if any budget for this category is breached
    budget_result = await db.execute(
        select(Budget).where(Budget.user_id == user_id, Budget.category == body.category)
    )
    budget = budget_result.scalar_one_or_none()
    if budget:
        today = Date.today()
        if budget.period == BudgetPeriod.monthly:
            from_date = today.replace(day=1)
        elif budget.period == BudgetPeriod.weekly:
            from_date = today - __import__("datetime").timedelta(days=today.weekday())
        else:
            from_date = today.replace(month=1, day=1)

        spent_result = await db.execute(
            select(Expense).where(
                Expense.user_id == user_id,
                Expense.category == body.category,
                Expense.date >= from_date,
            )
        )
        spent = float(sum(e.amount for e in spent_result.scalars().all()))
        pct = spent / float(budget.limit_amount) * 100 if budget.limit_amount > 0 else 0

        if pct >= 100:
            await _notify(
                str(user_id),
                f"🚨 Budget exceeded: {body.category}",
                f"You've spent ₹{spent:.0f} against your ₹{budget.limit_amount:.0f} {budget.period} budget.",
            )
        elif pct >= 80:
            await _notify(
                str(user_id),
                f"⚠️ Budget alert: {body.category} at {pct:.0f}%",
                f"You've used {pct:.0f}% of your ₹{budget.limit_amount:.0f} {budget.period} budget.",
            )

    return ExpenseResponse.model_validate(expense)


@router.get("/summary", response_model=ExpenseSummary)
async def get_summary(
    from_date: Date | None = None,
    to_date: Date | None = None,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ExpenseSummary:
    query = select(Expense).where(Expense.user_id == user_id)
    if from_date:
        query = query.where(Expense.date >= from_date)
    if to_date:
        query = query.where(Expense.date <= to_date)
    result = await db.execute(query)
    expenses = result.scalars().all()
    total = float(sum(e.amount for e in expenses))
    by_category: dict[str, float] = {}
    for e in expenses:
        by_category[e.category] = by_category.get(e.category, 0) + float(e.amount)
    return ExpenseSummary(total=total, by_category=by_category, count=len(expenses))


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ExpenseResponse:
    result = await db.execute(
        select(Expense).where(Expense.id == expense_id, Expense.user_id == user_id)
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    return ExpenseResponse.model_validate(expense)


@router.patch("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: uuid.UUID,
    body: ExpenseUpdate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ExpenseResponse:
    result = await db.execute(
        select(Expense).where(Expense.id == expense_id, Expense.user_id == user_id)
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(expense, field, value)
    await db.flush()
    await db.refresh(expense)
    return ExpenseResponse.model_validate(expense)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Expense).where(Expense.id == expense_id, Expense.user_id == user_id)
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    await db.delete(expense)
