import hashlib
import hmac
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.database import get_db
from src.dependencies import get_current_user
from src.models.user import User

router = APIRouter()

_PRO_AMOUNT_PAISE = 49900  # ₹499


class PlanResponse(BaseModel):
    plan: str
    plan_expires_at: datetime | None
    is_pro: bool


class OrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    key_id: str


class VerifyRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


def _is_pro(user: User) -> bool:
    if user.plan != "pro":
        return False
    if user.plan_expires_at is None:
        return True
    return user.plan_expires_at > datetime.now(timezone.utc)


@router.get("/plan", response_model=PlanResponse)
async def get_plan(current_user: User = Depends(get_current_user)) -> PlanResponse:
    return PlanResponse(
        plan=current_user.plan,
        plan_expires_at=current_user.plan_expires_at,
        is_pro=_is_pro(current_user),
    )


@router.post("/create-order", response_model=OrderResponse)
async def create_order(current_user: User = Depends(get_current_user)) -> OrderResponse:
    if not settings.razorpay_key_id or not settings.razorpay_key_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment gateway not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET",
        )

    async with httpx.AsyncClient(
        auth=(settings.razorpay_key_id, settings.razorpay_key_secret), timeout=10.0
    ) as client:
        resp = await client.post(
            "https://api.razorpay.com/v1/orders",
            json={
                "amount": _PRO_AMOUNT_PAISE,
                "currency": "INR",
                "receipt": f"pro_{current_user.id}",
            },
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to create payment order",
        )

    data = resp.json()
    return OrderResponse(
        order_id=data["id"],
        amount=data["amount"],
        currency=data["currency"],
        key_id=settings.razorpay_key_id,
    )


@router.post("/verify")
async def verify_payment(
    body: VerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if not settings.razorpay_key_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Payment gateway not configured")

    expected = hmac.new(
        settings.razorpay_key_secret.encode(),
        f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, body.razorpay_signature):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payment signature")

    current_user.plan = "pro"
    current_user.plan_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    await db.flush()

    return {"plan": "pro", "expires_at": current_user.plan_expires_at.isoformat(), "message": "Upgrade successful! Welcome to Pro."}
