"""Text extraction from uploaded files."""

from pathlib import Path


def extract_text(file_path: Path, content_type: str) -> str:
    raw = file_path.read_bytes()

    if content_type == "application/pdf":
        return _extract_pdf(raw)
    if content_type in ("text/plain", "text/markdown"):
        return raw.decode("utf-8", errors="replace")
    if content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return _extract_docx(raw)
    # Fallback: try utf-8
    return raw.decode("utf-8", errors="replace")


def _extract_pdf(raw: bytes) -> str:
    import io
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(raw))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _extract_docx(raw: bytes) -> str:
    try:
        import io
        from docx import Document as DocxDocument
        doc = DocxDocument(io.BytesIO(raw))
        return "\n".join(p.text for p in doc.paragraphs)
    except ImportError:
        return ""
