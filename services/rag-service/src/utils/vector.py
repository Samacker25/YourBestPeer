"""Embedding, chunking, and Pinecone operations."""

from __future__ import annotations

import uuid
from functools import lru_cache
from typing import Any

from src.config import settings

_CHUNK_SIZE = 500
_CHUNK_OVERLAP = 50
_EMBED_MODEL = "BAAI/bge-large-en-v1.5"
_TOP_K = 5


def _chunk_text(text: str) -> list[str]:
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + _CHUNK_SIZE
        chunks.append(text[start:end].strip())
        start = end - _CHUNK_OVERLAP
    return [c for c in chunks if c]


@lru_cache(maxsize=1)
def _get_embedder():
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer(_EMBED_MODEL)


def _embed(texts: list[str]) -> list[list[float]]:
    model = _get_embedder()
    return model.encode(texts, show_progress_bar=False).tolist()


def _get_index():
    from pinecone import Pinecone
    pc = Pinecone(api_key=settings.pinecone_api_key)
    return pc.Index(settings.pinecone_index_name)


def upsert_document(doc_id: str, user_id: str, text: str) -> int:
    chunks = _chunk_text(text)
    if not chunks:
        return 0

    embeddings = _embed(chunks)
    index = _get_index()

    vectors: list[dict[str, Any]] = [
        {
            "id": f"{doc_id}_{i}",
            "values": emb,
            "metadata": {
                "doc_id": doc_id,
                "user_id": user_id,
                "chunk_index": i,
                "text": chunk,
            },
        }
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings))
    ]

    batch = 100
    for i in range(0, len(vectors), batch):
        index.upsert(vectors=vectors[i : i + batch], namespace=user_id)

    return len(chunks)


def delete_document(doc_id: str, user_id: str, chunk_count: int) -> None:
    if chunk_count == 0:
        return
    index = _get_index()
    ids = [f"{doc_id}_{i}" for i in range(chunk_count)]
    index.delete(ids=ids, namespace=user_id)


def search(query: str, user_id: str) -> list[dict[str, Any]]:
    emb = _embed([query])[0]
    index = _get_index()
    result = index.query(
        vector=emb,
        top_k=_TOP_K,
        namespace=user_id,
        include_metadata=True,
    )
    return [
        {
            "score": match["score"],
            "text": match["metadata"].get("text", ""),
            "doc_id": match["metadata"].get("doc_id", ""),
            "chunk_index": match["metadata"].get("chunk_index", 0),
        }
        for match in result.get("matches", [])
    ]
