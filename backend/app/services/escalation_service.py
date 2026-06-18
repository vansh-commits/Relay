import uuid
from datetime import datetime

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.conversation import Conversation
from app.models.escalation import Escalation
from app.services.llm_service import llm_service

_OUT_OF_SCOPE_PHRASES = [
    "i don't have specific information about that",
    "i don't have information about",
    "not able to assist with",
    "outside my knowledge base",
    "cannot help with this",
    "i cannot find relevant information",
]


def should_escalate(confidence: float, response_text: str) -> tuple[bool, str]:
    if confidence < settings.CONFIDENCE_THRESHOLD:
        return True, "low_confidence"
    lower = response_text.lower()
    for phrase in _OUT_OF_SCOPE_PHRASES:
        if phrase in lower:
            return True, "out_of_scope"
    return False, ""


async def _generate_handoff_summary(messages: list[dict], reason: str, confidence: float) -> str:
    formatted = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in messages[-10:])
    prompt = f"""Generate a concise handoff summary for a human support specialist (max 150 words).

Escalation reason: {reason}
AI confidence score: {confidence:.2f}

Conversation:
{formatted}

Include:
1. Issue summary (1-2 sentences)
2. What the AI attempted
3. Why escalation was triggered
4. Recommended next steps for the human agent

Be concise and professional."""
    return await llm_service.chat(prompt)


async def create_escalation(
    conversation_id: uuid.UUID,
    reason: str,
    confidence_score: float,
    messages: list[dict],
    db: AsyncSession,
) -> Escalation:
    summary = await _generate_handoff_summary(messages, reason, confidence_score)

    escalation = Escalation(
        conversation_id=conversation_id,
        reason=reason,
        confidence_score=confidence_score,
        handoff_summary=summary,
        status="pending",
    )
    db.add(escalation)

    await db.execute(
        update(Conversation)
        .where(Conversation.id == conversation_id)
        .values(status="escalated", updated_at=datetime.utcnow())
    )

    await db.commit()
    await db.refresh(escalation)
    return escalation
