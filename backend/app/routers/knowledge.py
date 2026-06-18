import os
import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory, get_db
from app.models.knowledge_source import KnowledgeSource
from app.schemas.knowledge import IngestResponse, KnowledgeSourceOut, SourceListResponse
from app.services.ingestion_service import delete_from_chroma, run_ingestion

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

router = APIRouter()


@router.post("/ingest", response_model=IngestResponse, status_code=status.HTTP_202_ACCEPTED)
async def ingest_source(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    file: UploadFile | None = File(default=None),
    url: str | None = Form(default=None),
    db: AsyncSession = Depends(get_db),
):
    if file is None and not url:
        raise HTTPException(status_code=400, detail="Provide either a file or a URL")

    source_id = uuid.uuid4()

    if file is not None:
        ext = Path(file.filename or "").suffix.lower()
        source_type = "pdf" if ext == ".pdf" else "markdown"
        dest = UPLOAD_DIR / f"{source_id}{ext}"
        async with aiofiles.open(dest, "wb") as out:
            content = await file.read()
            await out.write(content)
        source_path = str(dest)
    else:
        source_type = "url"
        source_path = url

    source = KnowledgeSource(
        id=source_id,
        name=name,
        source_type=source_type,
        source_path=source_path,
        status="pending",
    )
    db.add(source)
    await db.commit()

    background_tasks.add_task(run_ingestion, source_id, async_session_factory)
    return IngestResponse(source_id=source_id, status="processing")


@router.get("/sources", response_model=SourceListResponse)
async def list_sources(
    status: str | None = None,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    query = select(KnowledgeSource)
    if status:
        query = query.where(KnowledgeSource.status == status)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar() or 0

    result = await db.execute(
        query.order_by(KnowledgeSource.created_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    sources = result.scalars().all()
    return SourceListResponse(
        sources=[KnowledgeSourceOut.model_validate(s) for s in sources],
        total=total,
        page=page,
    )


@router.delete("/sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_source(source_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    source = await db.get(KnowledgeSource, source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found")

    if source.source_path and os.path.isfile(source.source_path):
        os.remove(source.source_path)

    delete_from_chroma(source_id)
    await db.delete(source)
    await db.commit()


@router.post("/sources/{source_id}/reingest", response_model=IngestResponse, status_code=status.HTTP_202_ACCEPTED)
async def reingest_source(
    source_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    source = await db.get(KnowledgeSource, source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found")

    background_tasks.add_task(run_ingestion, source_id, async_session_factory)
    return IngestResponse(source_id=source_id, status="processing")
