import base64
import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import get_current_user_id
from src.config import settings
from src.database import get_db
from src.models.analysis import CareerAnalysis

router = APIRouter()

_ALLOWED_RESUME_TYPES = {"application/pdf", "text/plain", "application/msword",
                          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
_MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

_RESUME_PROMPT = """You are a professional career coach and resume expert. Analyse this resume and return ONLY valid JSON:
{{
  "summary": "2-3 sentence professional summary of the candidate",
  "experience_level": "junior|mid|senior|lead|executive",
  "years_experience": 0,
  "top_skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "skill_gaps": ["missing skill relevant to their field"],
  "strengths": [
    {{"point": "strength", "detail": "why this is strong"}}
  ],
  "improvements": [
    {{"point": "what to improve", "detail": "how to improve it", "priority": "high|medium|low"}}
  ],
  "ats_score": 75,
  "ats_tips": ["specific ATS optimisation tip"],
  "suggested_roles": ["role title that fits well"],
  "overall_rating": 7
}}
Be specific to the actual content of this resume. ATS score should reflect keyword density, formatting, and structure."""

_INTERVIEW_PROMPT = """You are a senior engineering interviewer. Generate 8 interview questions for a {role} role{resume_context}.

Return ONLY valid JSON:
[
  {{
    "category": "technical|behavioral|situational|culture",
    "question": "the interview question",
    "difficulty": "easy|medium|hard",
    "what_we_assess": "what skill or quality this tests",
    "ideal_answer_points": ["key point 1", "key point 2", "key point 3"],
    "follow_up": "one follow-up question"
  }}
]
Mix categories: 3 technical, 2 behavioral, 2 situational, 1 culture-fit. Make questions specific to the role."""


# ─── Response models ──────────────────────────────────────────────────────────

class ResumeStrength(BaseModel):
    point: str
    detail: str

class ResumeImprovement(BaseModel):
    point: str
    detail: str
    priority: str

class ResumeAnalysis(BaseModel):
    summary: str
    experience_level: str
    years_experience: int
    top_skills: list[str]
    skill_gaps: list[str]
    strengths: list[ResumeStrength]
    improvements: list[ResumeImprovement]
    ats_score: int
    ats_tips: list[str]
    suggested_roles: list[str]
    overall_rating: int

class InterviewQuestion(BaseModel):
    category: str
    question: str
    difficulty: str
    what_we_assess: str
    ideal_answer_points: list[str]
    follow_up: str

class AnalysisRecord(BaseModel):
    id: uuid.UUID
    type: str
    title: str
    created_at: datetime
    model_config = {"from_attributes": True}


def _get_gemini():
    import google.generativeai as genai
    genai.configure(api_key=settings.google_api_key)
    return genai.GenerativeModel("gemini-2.5-flash")


def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/analyze-resume", response_model=ResumeAnalysis)
async def analyze_resume(
    file: UploadFile = File(...),
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ResumeAnalysis:
    if not settings.google_api_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI not configured")

    content_type = file.content_type or "application/pdf"
    if content_type not in _ALLOWED_RESUME_TYPES:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                            detail="Unsupported file type. Upload PDF, DOCX, or plain text.")

    content = await file.read()
    if len(content) > _MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large (max 5 MB)")

    model = _get_gemini()

    # For PDFs use vision (inline_data); for text extract directly
    if content_type == "application/pdf":
        parts = [
            _RESUME_PROMPT,
            {"inline_data": {"mime_type": "application/pdf", "data": base64.b64encode(content).decode()}},
        ]
    else:
        resume_text = content.decode("utf-8", errors="replace")
        parts = [f"{_RESUME_PROMPT}\n\nRESUME TEXT:\n{resume_text}"]

    try:
        response = model.generate_content(parts)
        data = json.loads(_strip_fences(response.text))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=f"Could not analyse resume: {exc}")

    analysis = ResumeAnalysis(**data)

    record = CareerAnalysis(
        user_id=user_id,
        type="resume",
        title=file.filename or "Resume",
        content=json.dumps(data),
    )
    db.add(record)
    await db.flush()

    return analysis


@router.post("/interview-prep", response_model=list[InterviewQuestion])
async def interview_prep(
    role: str = Form(...),
    resume_text: str | None = Form(default=None),
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[InterviewQuestion]:
    if not settings.google_api_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI not configured")

    resume_context = f" based on this candidate's background:\n{resume_text[:2000]}" if resume_text else ""
    prompt = _INTERVIEW_PROMPT.format(role=role, resume_context=resume_context)

    model = _get_gemini()
    try:
        response = model.generate_content(prompt)
        data = json.loads(_strip_fences(response.text))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=f"Could not generate questions: {exc}")

    questions = [InterviewQuestion(**q) for q in data[:8]]

    record = CareerAnalysis(
        user_id=user_id,
        type="interview",
        title=f"Interview prep: {role}",
        content=json.dumps(data[:8]),
    )
    db.add(record)
    await db.flush()

    return questions


@router.get("/analyses", response_model=list[AnalysisRecord])
async def list_analyses(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[AnalysisRecord]:
    result = await db.execute(
        select(CareerAnalysis)
        .where(CareerAnalysis.user_id == user_id)
        .order_by(CareerAnalysis.created_at.desc())
        .limit(20)
    )
    return [AnalysisRecord.model_validate(r) for r in result.scalars().all()]


@router.get("/analyses/{analysis_id}")
async def get_analysis(
    analysis_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(CareerAnalysis).where(
            CareerAnalysis.id == analysis_id,
            CareerAnalysis.user_id == user_id,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")
    return {"id": str(record.id), "type": record.type, "title": record.title,
            "content": json.loads(record.content), "created_at": record.created_at.isoformat()}
