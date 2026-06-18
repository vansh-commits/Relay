import uuid

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.feedback import Feedback
from app.models.message import Message


async def create_feedback(
    message_id: uuid.UUID,
    conversation_id: uuid.UUID,
    rating: str,
    comment: str | None,
    db: AsyncSession,
) -> Feedback:
    fb = Feedback(
        message_id=message_id,
        conversation_id=conversation_id,
        rating=rating,
        comment=comment,
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)
    return fb


async def get_negative_feedback(db: AsyncSession, page: int, limit: int) -> tuple[list[dict], int]:
    offset = (page - 1) * limit
    result = await db.execute(
        select(Feedback, Message)
        .join(Message, Feedback.message_id == Message.id)
        .where(Feedback.rating == "negative")
        .order_by(Feedback.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = result.all()

    from sqlalchemy import func, select as sel
    count_result = await db.execute(sel(func.count()).select_from(Feedback).where(Feedback.rating == "negative"))
    total = count_result.scalar() or 0

    items = [
        {
            "feedback_id": str(row.Feedback.id),
            "message_id": str(row.Feedback.message_id),
            "message_content": row.Message.content,
            "retrieved_chunks": row.Message.retrieved_chunks,
            "comment": row.Feedback.comment,
            "reingest_flagged": row.Feedback.reingest_flagged,
            "created_at": row.Feedback.created_at.isoformat(),
        }
        for row in rows
    ]
    return items, total


async def flag_for_reingest(feedback_id: uuid.UUID, db: AsyncSession) -> Feedback:
    await db.execute(
        update(Feedback).where(Feedback.id == feedback_id).values(reingest_flagged=True)
    )
    await db.commit()
    result = await db.execute(select(Feedback).where(Feedback.id == feedback_id))
    return result.scalar_one()
