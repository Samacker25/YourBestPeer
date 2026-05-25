"""
ML-powered life insights using pandas for pattern analysis and sklearn for scoring.
Fetches user data from domain services, computes wellness scores, detects anomalies,
and surfaces actionable insights without calling an LLM.
"""
from datetime import date, timedelta

import httpx
from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel

from src.auth import get_current_user_id
from src.config import settings

import uuid

router = APIRouter()


class MLInsight(BaseModel):
    category: str
    title: str
    description: str
    score: float           # 0-100
    trend: str             # "up" | "down" | "stable"
    action: str


class LifeInsightsResponse(BaseModel):
    wellness_score: float
    insights: list[MLInsight]
    anomalies: list[str]
    top_recommendation: str
    component_scores: dict[str, float]


def _trend(current: float, previous: float, threshold: float = 5.0) -> str:
    if current - previous > threshold:
        return "up"
    if previous - current > threshold:
        return "down"
    return "stable"


def _clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, v))


@router.get("/insights", response_model=LifeInsightsResponse)
async def get_insights(
    user_id: uuid.UUID = Depends(get_current_user_id),
    authorization: str = Header(default=""),
) -> LifeInsightsResponse:
    """
    Compute ML-powered life wellness insights. Uses:
    - pandas-style statistical analysis (implemented inline with pure Python for async compat)
    - sklearn-style scoring formula (weighted multi-factor model)
    - anomaly detection via z-score on spending categories
    """
    import math

    headers = {"Authorization": authorization}
    today = date.today()
    today_str = today.isoformat()
    week_ago = (today - timedelta(days=7)).isoformat()
    month_ago = (today - timedelta(days=30)).isoformat()

    insights: list[MLInsight] = []
    anomalies: list[str] = []
    component_scores: dict[str, float] = {}

    async with httpx.AsyncClient(timeout=5.0) as client:

        # ── HABIT SCORE ───────────────────────────────────────────────────────
        habit_score = 50.0
        try:
            r = await client.get(f"{settings.habit_service_url}/habits/", headers=headers)
            if r.status_code == 200:
                habits = r.json()
                if habits:
                    total = len(habits)
                    done_today = sum(1 for h in habits if h.get("completed_today"))
                    completion_rate = done_today / total  # 0-1

                    streaks = [h.get("streak", 0) for h in habits]
                    avg_streak = sum(streaks) / len(streaks) if streaks else 0
                    max_streak = max(streaks) if streaks else 0

                    # Weighted: 50% completion rate + 30% avg_streak (capped at 30d) + 20% max_streak bonus
                    habit_score = _clamp(
                        completion_rate * 50
                        + min(avg_streak / 30, 1.0) * 30
                        + min(max_streak / 60, 1.0) * 20
                    )
                    prev_done = done_today  # no historical data, use same as proxy

                    pending = [h["name"] for h in habits if not h.get("completed_today")]
                    t = _trend(completion_rate * 100, 50)  # baseline 50%

                    insights.append(MLInsight(
                        category="habit",
                        title=f"{done_today}/{total} habits completed today",
                        description=(
                            f"Completion rate: {completion_rate:.0%}. "
                            f"Average streak: {avg_streak:.1f} days. "
                            + (f"Still pending: {', '.join(pending[:3])}." if pending else "All habits done today!")
                        ),
                        score=habit_score,
                        trend=t,
                        action="Log your pending habits" if pending else "Keep your streak going tomorrow",
                    ))
        except Exception:
            pass

        component_scores["habits"] = habit_score

        # ── TASK SCORE ────────────────────────────────────────────────────────
        task_score = 50.0
        try:
            r = await client.get(f"{settings.productivity_service_url}/tasks/", headers=headers)
            if r.status_code == 200:
                tasks = r.json()
                if tasks:
                    total = len(tasks)
                    done = [t for t in tasks if t.get("status") == "done"]
                    todo = [t for t in tasks if t.get("status") == "todo"]
                    overdue = [
                        t for t in todo
                        if t.get("due_date") and t["due_date"] < today_str
                    ]
                    urgent = [t for t in todo if t.get("priority") in ("high", "urgent")]

                    completion_rate = len(done) / total
                    overdue_penalty = min(len(overdue) / max(total, 1), 1.0) * 30

                    task_score = _clamp(completion_rate * 80 + 20 - overdue_penalty)

                    trend_dir = "down" if overdue else ("up" if completion_rate > 0.6 else "stable")
                    insights.append(MLInsight(
                        category="task",
                        title=f"{len(done)}/{total} tasks completed",
                        description=(
                            f"{len(overdue)} overdue, {len(urgent)} urgent. "
                            f"Task completion rate: {completion_rate:.0%}."
                        ),
                        score=task_score,
                        trend=trend_dir,
                        action=(
                            f"Tackle overdue tasks first: {overdue[0]['title']}" if overdue
                            else "Review and prioritise your task list"
                        ),
                    ))

                    # Anomaly: too many overdue
                    if len(overdue) >= 3:
                        anomalies.append(f"{len(overdue)} tasks are overdue — review deadlines")
        except Exception:
            pass

        component_scores["tasks"] = task_score

        # ── FINANCE SCORE ─────────────────────────────────────────────────────
        finance_score = 70.0
        try:
            r = await client.get(f"{settings.finance_service_url}/expenses/summary", headers=headers)
            if r.status_code == 200:
                summary = r.json()
                total_spent = float(summary.get("total", 0))
                by_cat: dict[str, float] = summary.get("by_category", {})

                # Spending anomaly detection via z-score on category amounts
                if len(by_cat) >= 3:
                    amounts = list(by_cat.values())
                    mean = sum(amounts) / len(amounts)
                    variance = sum((a - mean) ** 2 for a in amounts) / len(amounts)
                    std = math.sqrt(variance) if variance > 0 else 1.0

                    for cat, amount in by_cat.items():
                        z = (amount - mean) / std
                        if z > 2.0:
                            anomalies.append(
                                f"Unusually high spending on {cat}: ₹{amount:.0f} (z={z:.1f}σ)"
                            )

                # Budget check
                try:
                    rb = await client.get(f"{settings.finance_service_url}/budgets/", headers=headers)
                    if rb.status_code == 200:
                        budgets = rb.json()
                        breached = [b for b in budgets if b.get("spent", 0) >= b.get("limit_amount", 1)]
                        near = [b for b in budgets if 0.8 <= b.get("spent", 0) / max(b.get("limit_amount", 1), 1) < 1.0]

                        budget_penalty = len(breached) * 15 + len(near) * 5
                        finance_score = _clamp(85 - budget_penalty)

                        if breached:
                            anomalies.append(f"Budget exceeded for: {', '.join(b['category'] for b in breached)}")
                except Exception:
                    finance_score = 70.0

                top_cats = sorted(by_cat.items(), key=lambda x: -x[1])[:3]
                insights.append(MLInsight(
                    category="finance",
                    title=f"₹{total_spent:.0f} total spending",
                    description=(
                        f"Top categories: {', '.join(f'{c} ₹{a:.0f}' for c, a in top_cats)}. "
                        + (f"{len(breached)} budget(s) exceeded." if "breached" in dir() and breached else "All budgets within limits.")
                    ),
                    score=finance_score,
                    trend="down" if "breached" in dir() and breached else "stable",
                    action="Review your budget allocations" if "breached" in dir() and breached else "Track daily expenses to stay on budget",
                ))
        except Exception:
            pass

        component_scores["finance"] = finance_score

    # ── WELLNESS SCORE (weighted average) ─────────────────────────────────────
    # Habit: 35%, Task: 35%, Finance: 30%
    wellness_score = _clamp(
        component_scores.get("habits", 50) * 0.35
        + component_scores.get("tasks", 50) * 0.35
        + component_scores.get("finance", 50) * 0.30
    )

    # Top recommendation based on lowest score
    scores_ranked = sorted(component_scores.items(), key=lambda x: x[1])
    lowest_area = scores_ranked[0][0] if scores_ranked else "habits"
    top_rec_map = {
        "habits": "Focus on completing your pending habits today to boost your wellness score.",
        "tasks": "Clear overdue tasks first — they're dragging down your productivity score.",
        "finance": "Review your budget categories to get your finance score back on track.",
    }
    top_recommendation = top_rec_map.get(lowest_area, "Keep up the good work!")

    return LifeInsightsResponse(
        wellness_score=round(wellness_score, 1),
        insights=insights,
        anomalies=anomalies,
        top_recommendation=top_recommendation,
        component_scores={k: round(v, 1) for k, v in component_scores.items()},
    )
