import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("messages.id"), nullable=False, index=True)
    conversation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False)
    rating: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # positive | negative
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    reingest_flagged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"), index=True)

    message: Mapped["Message"] = relationship("Message", back_populates="feedbacks")
    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="feedbacks")
