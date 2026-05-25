import asyncio
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import get_current_user_id
from src.config import settings
from src.database import get_db
from src.models.document import Document, DocumentStatus

router = APIRouter()

_ALLOWED_TYPES = {
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
_MAX_SIZE = 10 * 1024 * 1024  # 10 MB


class DocumentResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    filename: str
    file_size: int
    status: DocumentStatus
    chunk_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class SearchRequest(BaseModel):
    query: str


class SearchResult(BaseModel):
    answer: str
    chunks: list[dict]


async def _process_document(doc_id: str, user_id: str, file_path: Path, content_type: str) -> None:
    """Background task: extract → chunk → embed → upsert to Pinecone → update DB."""
    from src.database import AsyncSessionLocal
    from src.utils.extract import extract_text
    from src.utils.vector import upsert_document

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Document).where(Document.id == uuid.UUID(doc_id)))
        doc = result.scalar_one_or_none()
        if not doc:
            return

        try:
            doc.status = DocumentStatus.processing
            await db.flush()

            text = await asyncio.get_event_loop().run_in_executor(
                None, extract_text, file_path, content_type
            )

            if not settings.pinecone_api_key:
                doc.status = DocumentStatus.ready
                await db.commit()
                return

            chunk_count = await asyncio.get_event_loop().run_in_executor(
                None, upsert_document, doc_id, user_id, text
            )

            doc.chunk_count = chunk_count
            doc.status = DocumentStatus.ready
        except Exception:
            doc.status = DocumentStatus.failed

        await db.commit()


@router.get("/", response_model=list[DocumentResponse])
async def list_documents(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[DocumentResponse]:
    result = await db.execute(
        select(Document).where(Document.user_id == user_id).order_by(Document.created_at.desc())
    )
    return [DocumentResponse.model_validate(d) for d in result.scalars().all()]


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> DocumentResponse:
    content_type = file.content_type or "text/plain"
    if content_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type. Allowed: PDF, TXT, MD, DOCX",
        )

    content = await file.read()
    if len(content) > _MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large (max 10 MB)",
        )

    upload_path = Path(settings.upload_dir) / str(user_id)
    upload_path.mkdir(parents=True, exist_ok=True)
    file_path = upload_path / (file.filename or "upload.bin")
    file_path.write_bytes(content)

    doc = Document(
        user_id=user_id,
        filename=file.filename or "upload",
        file_size=len(content),
        status=DocumentStatus.pending,
    )
    db.add(doc)
    await db.flush()
    await db.commit()

    background_tasks.add_task(
        _process_document,
        str(doc.id),
        str(user_id),
        file_path,
        content_type,
    )

    await db.refresh(doc)
    return DocumentResponse.model_validate(doc)


@router.post("/search", response_model=SearchResult)
async def search_documents(
    body: SearchRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
) -> SearchResult:
    if not settings.pinecone_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Vector search not configured — set PINECONE_API_KEY",
        )
    if not settings.google_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI not configured — set GOOGLE_API_KEY",
        )

    from src.utils.vector import search as vector_search

    chunks = await asyncio.get_event_loop().run_in_executor(
        None, vector_search, body.query, str(user_id)
    )

    if not chunks:
        return SearchResult(answer="No relevant documents found in your knowledge base.", chunks=[])

    context = "\n\n---\n\n".join(c["text"] for c in chunks)

    import google.generativeai as genai
    genai.configure(api_key=settings.google_api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")
    prompt = (
        f"Answer the following question based only on the provided context.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {body.query}\n\n"
        "Answer concisely and accurately. If the context doesn't contain enough information, say so."
    )
    response = model.generate_content(prompt)
    answer = response.text if hasattr(response, "text") else str(response)

    return SearchResult(answer=answer, chunks=chunks)


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == user_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if settings.pinecone_api_key and doc.chunk_count > 0:
        from src.utils.vector import delete_document as vector_delete
        await asyncio.get_event_loop().run_in_executor(
            None, vector_delete, str(doc_id), str(user_id), doc.chunk_count
        )

    await db.delete(doc)
