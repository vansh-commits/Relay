import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.conversation import Conversation
from app.models.escalation import Escalation
from app.schemas.escalation import AssignRequest, EscalationListResponse, EscalationOut, ResolveRequest

router = APIRouter()


@router.get("", response_model=EscalationListResponse)
async def list_escalations(
    status: str | None = None,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    query = select(Escalation)
    if status:
        query = query.where(Escalation.status == status)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar() or 0

    result = await db.execute(
        query.order_by(Escalation.created_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    escalations = result.scalars().all()
    return EscalationListResponse(
        escalations=[EscalationOut.model_validate(e) for e in escalations],
        total=total,
    )


@router.get("/{escalation_id}", response_model=EscalationOut)
async def get_escalation(escalation_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    esc = await db.get(Escalation, escalation_id)
    if esc is None:
        raise HTTPException(status_code=404, detail="Escalation not found")
    return EscalationOut.model_validate(esc)


@router.put("/{escalation_id}/assign", response_model=EscalationOut)
async def assign_escalation(
    escalation_id: uuid.UUID,
    body: AssignRequest,
    db: AsyncSession = Depends(get_db),
):
    esc = await db.get(Escalation, escalation_id)
    if esc is None:
        raise HTTPException(status_code=404, detail="Escalation not found")

    await db.execute(
        update(Escalation)
        .where(Escalation.id == escalation_id)
        .values(status="assigned", assigned_agent=body.agent_name)
    )
    await db.commit()
    await db.refresh(esc)
    return EscalationOut.model_validate(esc)


@router.put("/{escalation_id}/resolve", response_model=EscalationOut)
async def resolve_escalation(
    escalation_id: uuid.UUID,
    body: ResolveRequest,
    db: AsyncSession = Depends(get_db),
):
    esc = await db.get(Escalation, escalation_id)
    if esc is None:
        raise HTTPException(status_code=404, detail="Escalation not found")

    now = datetime.utcnow()
    await db.execute(
        update(Escalation)
        .where(Escalation.id == escalation_id)
        .values(status="resolved", resolution_notes=body.resolution_notes, resolved_at=now)
    )
    await db.execute(
        update(Conversation)
        .where(Conversation.id == esc.conversation_id)
        .values(status="resolved", updated_at=now)
    )
    await db.commit()
    await db.refresh(esc)
    return EscalationOut.model_validate(esc)
