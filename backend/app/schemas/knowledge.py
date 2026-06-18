from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class KnowledgeSourceOut(BaseModel):
    id: UUID
    name: str
    source_type: str
    source_path: str | None
    status: str
    chunk_count: int
    error_message: str | None
    last_ingested_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class IngestResponse(BaseModel):
    source_id: UUID
    status: str


class SourceListResponse(BaseModel):
    sources: list[KnowledgeSourceOut]
    total: int
    page: int
