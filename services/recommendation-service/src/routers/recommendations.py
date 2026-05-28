import json
import uuid
from datetime import date, datetime

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import get_current_user_id
from src.config import settings
from src.database import get_db
from src.models.recommendation import Recommendation, RecommendationCategory

_GENERATE_PROMPT = """You are a personal life coach AI. Analyse the user's current data below and generate 5-8 personalised, actionable recommendations.

USER DATA:
{user_data}

Return ONLY valid JSON — no markdown, no explanation:
[
  {{
    "category": "habit",
    "title": "Short recommendation title",
    "description": "1-2 sentence actionable description.",
    "reason": "Why this is relevant based on their data."
  }}
]
Categories must be one of: habit, task, finance, learning, wellness
Make recommendations specific to the actual data provided. Prioritise the most impactful suggestions."""

router = APIRouter()


class RecommendationCreate(BaseModel):
    user_id: uuid.UUID
    category: RecommendationCategory
    title: str
    description: str
    reason: str


class RecommendationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    category: RecommendationCategory
    title: str
    description: str
    reason: str
    is_dismissed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[RecommendationResponse])
async def list_recommendations(
    category: RecommendationCategory | None = None,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[RecommendationResponse]:
    query = select(Recommendation).where(
        Recommendation.user_id == user_id,
        Recommendation.is_dismissed == False,
    )
    if category:
        query = query.where(Recommendation.category == category)
    result = await db.execute(query.order_by(Recommendation.created_at.desc()))
    return [RecommendationResponse.model_validate(r) for r in result.scalars().all()]


@router.post("/", response_model=RecommendationResponse, status_code=status.HTTP_201_CREATED)
async def create_recommendation(
    body: RecommendationCreate,
    db: AsyncSession = Depends(get_db),
) -> RecommendationResponse:
    rec = Recommendation(**body.model_dump())
    db.add(rec)
    await db.flush()
    return RecommendationResponse.model_validate(rec)


@router.post("/generate", response_model=list[RecommendationResponse])
async def generate_recommendations(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    authorization: str = Header(default=""),
) -> list[RecommendationResponse]:
    if not settings.google_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI not configured — set GOOGLE_API_KEY",
        )

    headers = {"Authorization": authorization}
    today = date.today().isoformat()
    data_parts: list[str] = [f"Today: {today}"]

    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            r = await client.get(f"{settings.productivity_service_url}/tasks/", headers=headers)
            if r.status_code == 200:
                tasks = r.json()
                todo = [t for t in tasks if t["status"] == "todo"]
                done = [t for t in tasks if t["status"] == "done"]
                overdue = [t for t in todo if t.get("due_date") and t["due_date"] < today]
                data_parts.append(
                    f"Tasks: {len(todo)} to-do ({len(overdue)} overdue), {len(done)} completed. "
                    f"To-do titles: {', '.join(t['title'] for t in todo[:8])}"
                )
        except Exception:
            pass

        try:
            r = await client.get(f"{settings.habit_service_url}/habits/", headers=headers)
            if r.status_code == 200:
                habits = r.json()
                pending = [h for h in habits if not h["completed_today"]]
                top_streaks = sorted(habits, key=lambda h: h["streak"], reverse=True)[:3]
                data_parts.append(
                    f"Habits: {len(habits)} total, {len(pending)} not done today. "
                    f"Top streaks: {', '.join(f'{h[\"name\"]} ({h[\"streak\"]}d)' for h in top_streaks)}"
                )
        except Exception:
            pass

        try:
            r = await client.get(f"{settings.finance_service_url}/expenses/summary", headers=headers)
            if r.status_code == 200:
                s = r.json()
                top_cats = sorted(s.get("by_category", {}).items(), key=lambda x: -x[1])[:3]
                data_parts.append(
                    f"Finance: ₹{s['total']:.0f} spent across {s['count']} expenses. "
                    f"Top: {', '.join(f'{c} ₹{a:.0f}' for c, a in top_cats)}"
                )
        except Exception:
            pass

    user_data = "\n".join(data_parts)
    prompt = _GENERATE_PROMPT.format(user_data=user_data)

    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import HumanMessage
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=settings.google_api_key, temperature=0.7)

    try:
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        raw = response.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        recs_data = json.loads(raw)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate recommendations: {exc}",
        )

    # Remove old undismissed recommendations before inserting fresh ones
    old_result = await db.execute(
        select(Recommendation).where(
            Recommendation.user_id == user_id,
            Recommendation.is_dismissed == False,
        )
    )
    for old in old_result.scalars().all():
        await db.delete(old)

    created: list[RecommendationResponse] = []
    for item in recs_data[:8]:
        try:
            cat = RecommendationCategory(item.get("category", "habit"))
        except ValueError:
            cat = RecommendationCategory.habit

        rec = Recommendation(
            user_id=user_id,
            category=cat,
            title=item.get("title", ""),
            description=item.get("description", ""),
            reason=item.get("reason", ""),
        )
        db.add(rec)
        await db.flush()
        created.append(RecommendationResponse.model_validate(rec))

    return created


@router.patch("/{rec_id}/dismiss", status_code=status.HTTP_204_NO_CONTENT)
async def dismiss(
    rec_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Recommendation).where(
            Recommendation.id == rec_id, Recommendation.user_id == user_id
        )
    )
    rec = result.scalar_one_or_none()
    if rec:
        rec.is_dismissed = True
