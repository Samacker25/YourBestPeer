import base64
import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import get_current_user_id
from src.config import settings
from src.database import get_db
from src.models.note import Note

router = APIRouter()

_SCAN_PROMPT = """You are a document scanner AI. Extract all text from this image.
The image may contain: handwritten notes, whiteboard content, printed documents, diagrams with text labels, or any other text.
Return ONLY valid JSON — no markdown, no explanation — in exactly this structure:
{
  "title": "Brief descriptive title (max 60 chars)",
  "content": "Full extracted text formatted as markdown. Use # for headings, - for bullet lists, etc. Preserve the structure of the original as best as possible.",
  "tags": ["topic1", "topic2"]
}
Rules:
- Extract ALL visible text, including small labels, headers, and footnotes
- Format content as clean markdown
- Tags should reflect the main topics (max 5 tags, lowercase)
- If the image has multiple sections, use markdown headings to organize them"""

_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/gif"}
_MAX_IMAGE_SIZE = 5 * 1024 * 1024


class NoteCreate(BaseModel):
    title: str
    content: str = ""
    tags: list[str] = []


class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    tags: list[str] | None = None


class NoteResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    content: str
    tags: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


@router.post("/scan-image", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def scan_image_to_note(
    file: UploadFile = File(...),
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> NoteResponse:
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

    raw_bytes = await file.read()
    if len(raw_bytes) > _MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image too large (max 5 MB)",
        )

    import google.generativeai as genai
    genai.configure(api_key=settings.google_api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")

    image_part = {
        "inline_data": {
            "mime_type": content_type,
            "data": base64.b64encode(raw_bytes).decode(),
        }
    }

    try:
        response = model.generate_content([_SCAN_PROMPT, image_part])
        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not extract text from image: {exc}",
        )

    note = Note(
        user_id=user_id,
        title=data.get("title", "Scanned Note"),
        content=data.get("content", ""),
        tags=data.get("tags", []),
    )
    db.add(note)
    await db.flush()
    return NoteResponse.model_validate(note)


@router.get("/", response_model=list[NoteResponse])
async def list_notes(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[NoteResponse]:
    result = await db.execute(
        select(Note).where(Note.user_id == user_id).order_by(Note.updated_at.desc())
    )
    return [NoteResponse.model_validate(n) for n in result.scalars().all()]


@router.post("/", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    body: NoteCreate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> NoteResponse:
    note = Note(user_id=user_id, **body.model_dump())
    db.add(note)
    await db.flush()
    return NoteResponse.model_validate(note)


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> NoteResponse:
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == user_id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return NoteResponse.model_validate(note)


@router.patch("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: uuid.UUID,
    body: NoteUpdate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> NoteResponse:
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == user_id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(note, field, value)
    await db.flush()
    return NoteResponse.model_validate(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == user_id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    await db.delete(note)
