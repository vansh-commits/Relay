import uuid
from pathlib import Path

import chromadb
import fitz  # PyMuPDF
import httpx
from bs4 import BeautifulSoup
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import settings
from app.core.logging import logger
from app.models.knowledge_source import KnowledgeSource
from app.services.gemini_service import gemini_service

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def _get_chroma_collection():
    client = chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)
    return client.get_or_create_collection("knowledge_base", metadata={"hnsw:space": "cosine"})


def _extract_pdf(file_path: str) -> str:
    doc = fitz.open(file_path)
    pages = [page.get_text("text") for page in doc]
    return "\n\n".join(pages)


def _extract_markdown(file_path: str) -> str:
    return Path(file_path).read_text(encoding="utf-8")


async def _extract_url(url: str) -> str:
    async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    container = soup.find("main") or soup.find("article") or soup.body
    if container is None:
        return soup.get_text(separator="\n", strip=True)
    return container.get_text(separator="\n", strip=True)


async def _embed_and_store(
    chunks: list[str],
    source_id: uuid.UUID,
    source_name: str,
    source_type: str,
) -> int:
    collection = _get_chroma_collection()
    embeddings = await gemini_service.embed_batch(chunks)
    ids = [f"{source_id}_{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "source_id": str(source_id),
            "source_name": source_name,
            "source_type": source_type,
            "chunk_index": i,
        }
        for i in range(len(chunks))
    ]
    collection.upsert(ids=ids, documents=chunks, embeddings=embeddings, metadatas=metadatas)
    return len(chunks)


async def run_ingestion(source_id: uuid.UUID, db_factory: async_sessionmaker) -> None:
    async with db_factory() as db:
        source = await db.get(KnowledgeSource, source_id)
        if source is None:
            logger.error("Knowledge source not found", source_id=str(source_id))
            return

        await db.execute(
            update(KnowledgeSource).where(KnowledgeSource.id == source_id).values(status="processing")
        )
        await db.commit()

        try:
            if source.source_type == "pdf":
                text = _extract_pdf(source.source_path)
            elif source.source_type == "markdown":
                text = _extract_markdown(source.source_path)
            elif source.source_type == "url":
                text = await _extract_url(source.source_path)
            else:
                raise ValueError(f"Unsupported source type: {source.source_type}")

            chunks = _splitter.split_text(text)
            if not chunks:
                raise ValueError("No text content extracted from source")

            chunk_count = await _embed_and_store(chunks, source_id, source.name, source.source_type)

            await db.execute(
                update(KnowledgeSource)
                .where(KnowledgeSource.id == source_id)
                .values(status="active", chunk_count=chunk_count, last_ingested_at=__import__("datetime").datetime.utcnow())
            )
            await db.commit()
            logger.info("Ingestion complete", source_id=str(source_id), chunks=chunk_count)

        except Exception as exc:
            logger.error("Ingestion failed", source_id=str(source_id), error=str(exc))
            await db.execute(
                update(KnowledgeSource)
                .where(KnowledgeSource.id == source_id)
                .values(status="failed", error_message=str(exc))
            )
            await db.commit()


def delete_from_chroma(source_id: uuid.UUID) -> None:
    collection = _get_chroma_collection()
    results = collection.get(where={"source_id": str(source_id)}, include=[])
    if results["ids"]:
        collection.delete(ids=results["ids"])
