import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.logging import logger
from app.database import async_session_factory, get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User
from app.schemas.chat import ConversationDetail, ConversationOut, MessageOut
from app.services import auth_service, escalation_service, rag_service

router = APIRouter()        # REST endpoints, mounted under /api/v1
ws_router = APIRouter()     # WebSocket, mounted at root (no prefix)


class ConnectionManager:
    def __init__(self):
        self._active: dict[str, WebSocket] = {}

    async def connect(self, session_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._active[session_id] = ws

    def disconnect(self, session_id: str) -> None:
        self._active.pop(session_id, None)

    async def send(self, session_id: str, data: dict) -> None:
        ws = self._active.get(session_id)
        if ws:
            await ws.send_text(json.dumps(data))


manager = ConnectionManager()


async def _get_or_create_conversation(session_id: str, db: AsyncSession, user_id=None) -> Conversation:
    result = await db.execute(select(Conversation).where(Conversation.session_id == session_id))
    conv = result.scalar_one_or_none()
    if conv is None:
        conv = Conversation(session_id=session_id, user_id=user_id)
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
    return conv


@ws_router.websocket("/ws/chat/{session_id}")
async def websocket_chat(session_id: str, websocket: WebSocket):
    # Authenticate from the ?token= query param (browsers can't set WS headers).
    payload = auth_service.decode_token(websocket.query_params.get("token", ""))
    if not payload:
        await websocket.close(code=4401)  # unauthorized
        return

    user_id = uuid.UUID(payload["sub"])
    await manager.connect(session_id, websocket)
    logger.info("WebSocket connected", session_id=session_id, user_id=str(user_id))

    async with async_session_factory() as db:
        conversation = await _get_or_create_conversation(session_id, db, user_id)

        await manager.send(session_id, {
            "type": "connected",
            "session_id": session_id,
            "conversation_id": str(conversation.id),
        })

        try:
            while True:
                raw = await websocket.receive_text()
                frame = json.loads(raw)

                if frame.get("type") == "ping":
                    await manager.send(session_id, {"type": "pong"})
                    continue

                if frame.get("type") != "message":
                    continue

                user_content = frame.get("content", "").strip()
                if not user_content:
                    continue

                # Enforce the guest free-question quota
                user = await db.get(User, user_id)
                if user and user.is_guest and user.question_count >= settings.GUEST_QUESTION_LIMIT:
                    await manager.send(session_id, {
                        "type": "quota_exceeded",
                        "message": "You've used all your free questions. Sign up to continue chatting.",
                    })
                    continue

                # Store user message
                user_msg = Message(
                    conversation_id=conversation.id,
                    role="user",
                    content=user_content,
                )
                db.add(user_msg)
                if user:
                    user.question_count += 1
                await db.commit()
                await db.refresh(user_msg)

                # Only go silent once a human agent has actually picked up the
                # ticket (status "assigned"). A merely pending escalation must NOT
                # stop the AI from answering the next question — otherwise one
                # off-topic question would mute the assistant for the whole session.
                status_res = await db.execute(
                    select(Conversation.status).where(Conversation.id == conversation.id)
                )
                if status_res.scalar_one() == "assigned":
                    continue

                # Greetings / pleasantries get a friendly canned reply so they
                # don't fall through to RAG and escalate. No API call.
                canned = rag_service.small_talk_reply(user_content)
                if canned:
                    greeting_msg = Message(
                        conversation_id=conversation.id,
                        role="assistant",
                        content=canned,
                        confidence_score=1.0,
                    )
                    db.add(greeting_msg)
                    await db.commit()
                    await db.refresh(greeting_msg)
                    await manager.send(session_id, {
                        "type": "message",
                        "message_id": str(greeting_msg.id),
                        "role": "assistant",
                        "content": canned,
                        "confidence": 1.0,
                        "mode": "ai",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    })
                    continue

                # Signal typing
                await manager.send(session_id, {"type": "typing", "role": "assistant"})

                # Retrieve (1 embedding call). If it fails — including the embedding
                # rate limit — treat it as "can't answer confidently" and hand off to
                # a human instead of blocking the user with an error.
                try:
                    chunks, confidence = await rag_service.retrieve_context(user_content)
                except Exception as exc:
                    logger.warning("Retrieval failed; escalating", error=str(exc))
                    chunks, confidence = [], 0.0

                history = await rag_service.get_conversation_history(session_id, db, limit=10)

                if confidence < settings.CONFIDENCE_THRESHOLD:
                    # No confident match → escalate, skip generation entirely.
                    do_escalate, reason, content = True, "low_confidence", None
                else:
                    try:
                        content = await rag_service.generate_answer(user_content, chunks, history)
                        do_escalate, reason = escalation_service.should_escalate(confidence, content)
                    except Exception as exc:
                        detail = str(exc)
                        logger.error("Generation error", error=detail)
                        if "429" in detail or "quota" in detail.lower() or "rate" in detail.lower():
                            msg = "We're experiencing high demand right now. Please try again in a moment."
                            code = "RATE_LIMITED"
                        else:
                            msg = "Something went wrong. Please try again."
                            code = "INTERNAL_ERROR"
                        await manager.send(session_id, {"type": "error", "code": code, "message": msg})
                        continue

                # Persist the assistant turn only when we actually generated one
                assistant_msg = None
                if content is not None:
                    assistant_msg = Message(
                        conversation_id=conversation.id,
                        role="assistant",
                        content=content,
                        confidence_score=confidence,
                        retrieved_chunks=chunks,
                    )
                    db.add(assistant_msg)
                    await db.commit()
                    await db.refresh(assistant_msg)

                if do_escalate:
                    if history is None:
                        history = await rag_service.get_conversation_history(session_id, db, limit=10)
                    esc = await escalation_service.create_escalation(
                        conversation_id=conversation.id,
                        reason=reason,
                        confidence_score=confidence,
                        messages=history,
                        db=db,
                    )
                    await manager.send(session_id, {
                        "type": "escalation",
                        "escalation_id": str(esc.id),
                        "reason": reason,
                        "message": "I'm connecting you with a support specialist who can better assist you.",
                    })
                else:
                    await manager.send(session_id, {
                        "type": "message",
                        "message_id": str(assistant_msg.id),
                        "role": "assistant",
                        "content": content,
                        "confidence": confidence,
                        "mode": "ai",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    })

        except WebSocketDisconnect:
            logger.info("WebSocket disconnected", session_id=session_id)
        except Exception as exc:
            logger.error("WebSocket error", session_id=session_id, error=str(exc))
        finally:
            manager.disconnect(session_id)


@router.get("/conversations/{session_id}", response_model=ConversationDetail)
async def get_conversation(session_id: str, db: AsyncSession = Depends(get_db)):
    conversation = await _get_or_create_conversation(session_id, db)
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()
    return ConversationDetail(
        conversation=ConversationOut.model_validate(conversation),
        messages=[MessageOut.model_validate(m) for m in messages],
    )
