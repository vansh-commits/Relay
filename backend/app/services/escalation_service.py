import uuid
from datetime import datetime

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.conversation import Conversation
from app.models.escalation import Escalation

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


_REASON_TEXT = {
    "low_confidence": "the knowledge base did not contain a confident match for the question",
    "out_of_scope": "the question falls outside the available knowledge base",
    "user_request": "the customer asked to speak with a person",
}


def _build_handoff_summary(messages: list[dict], reason: str, confidence: float) -> str:
    """Template-based summary — no LLM call, so escalation costs zero API requests."""
    last_user = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
    recent = "\n".join(f"  {m['role']}: {m['content']}" for m in messages[-6:])
    return (
        f"Customer question: {last_user}\n\n"
        f"Escalation reason: {_REASON_TEXT.get(reason, reason)} "
        f"(confidence {confidence:.0%}).\n\n"
        f"Recent conversation:\n{recent}\n\n"
        f"Next step: review the question and respond directly to the customer."
    )


async def create_escalation(
    conversation_id: uuid.UUID,
    reason: str,
    confidence_score: float,
    messages: list[dict],
    db: AsyncSession,
) -> Escalation:
    summary = _build_handoff_summary(messages, reason, confidence_score)

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
