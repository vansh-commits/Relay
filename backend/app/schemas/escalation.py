from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class EscalationOut(BaseModel):
    id: UUID
    conversation_id: UUID
    reason: str
    confidence_score: float | None
    handoff_summary: str | None
    status: str
    assigned_agent: str | None
    resolution_notes: str | None
    created_at: datetime
    resolved_at: datetime | None

    model_config = {"from_attributes": True}


class EscalationListResponse(BaseModel):
    escalations: list[EscalationOut]
    total: int


class AssignRequest(BaseModel):
    agent_name: str


class ResolveRequest(BaseModel):
    resolution_notes: str
