from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class MessageOut(BaseModel):
    id: UUID
    role: str
    content: str
    confidence_score: float | None
    retrieved_chunks: list[dict]
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationOut(BaseModel):
    id: UUID
    session_id: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetail(BaseModel):
    conversation: ConversationOut
    messages: list[MessageOut]
