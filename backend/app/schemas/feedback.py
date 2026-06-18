from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class FeedbackCreate(BaseModel):
    message_id: UUID
    conversation_id: UUID
    rating: str  # positive | negative
    comment: str | None = None


class FeedbackOut(BaseModel):
    id: UUID
    message_id: UUID
    conversation_id: UUID
    rating: str
    comment: str | None
    reingest_flagged: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NegativeFeedbackListResponse(BaseModel):
    items: list[dict]
    total: int
