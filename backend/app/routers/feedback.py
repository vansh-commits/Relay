import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.feedback import FeedbackCreate, FeedbackOut, NegativeFeedbackListResponse
from app.services.feedback_service import create_feedback, flag_for_reingest, get_negative_feedback

router = APIRouter()


@router.post("", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
async def submit_feedback(body: FeedbackCreate, db: AsyncSession = Depends(get_db)):
    if body.rating not in ("positive", "negative"):
        raise HTTPException(status_code=400, detail="Rating must be 'positive' or 'negative'")
    fb = await create_feedback(body.message_id, body.conversation_id, body.rating, body.comment, db)
    return FeedbackOut.model_validate(fb)


@router.get("/negative", response_model=NegativeFeedbackListResponse)
async def list_negative_feedback(page: int = 1, limit: int = 20, db: AsyncSession = Depends(get_db)):
    items, total = await get_negative_feedback(db, page, limit)
    return NegativeFeedbackListResponse(items=items, total=total)


@router.put("/{feedback_id}/flag-reingest", response_model=FeedbackOut)
async def flag_feedback_reingest(feedback_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    fb = await flag_for_reingest(feedback_id, db)
    return FeedbackOut.model_validate(fb)
