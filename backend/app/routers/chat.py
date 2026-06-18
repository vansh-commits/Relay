import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.database import async_session_factory, get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.chat import ConversationDetail, ConversationOut, MessageOut
from app.services import escalation_service, rag_service

router = APIRouter()


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


async def _get_or_create_conversation(session_id: str, db: AsyncSession) -> Conversation:
    result = await db.execute(select(Conversation).where(Conversation.session_id == session_id))
    conv = result.scalar_one_or_none()
    if conv is None:
        conv = Conversation(session_id=session_id)
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
    return conv


@router.websocket("/ws/chat/{session_id}")
async def websocket_chat(session_id: str, websocket: WebSocket):
    await manager.connect(session_id, websocket)
    logger.info("WebSocket connected", session_id=session_id)

    async with async_session_factory() as db:
        conversation = await _get_or_create_conversation(session_id, db)

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

                # Store user message
                user_msg = Message(
                    conversation_id=conversation.id,
                    role="user",
                    content=user_content,
                )
                db.add(user_msg)
                await db.commit()
                await db.refresh(user_msg)

                # Signal typing
                await manager.send(session_id, {"type": "typing", "role": "assistant"})

                try:
                    result = await rag_service.generate_response(user_content, session_id, db)
                except Exception as exc:
                    logger.error("RAG error", error=str(exc))
                    await manager.send(session_id, {"type": "error", "code": "INTERNAL_ERROR", "message": "Something went wrong. Please try again."})
                    continue

                do_escalate, reason = escalation_service.should_escalate(
                    result["confidence_score"], result["content"]
                )

                # Store assistant message
                assistant_msg = Message(
                    conversation_id=conversation.id,
                    role="assistant",
                    content=result["content"],
                    confidence_score=result["confidence_score"],
                    retrieved_chunks=result["retrieved_chunks"],
                )
                db.add(assistant_msg)
                await db.commit()
                await db.refresh(assistant_msg)

                if do_escalate:
                    history = await rag_service.get_conversation_history(session_id, db, limit=20)
                    esc = await escalation_service.create_escalation(
                        conversation_id=conversation.id,
                        reason=reason,
                        confidence_score=result["confidence_score"],
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
                        "content": result["content"],
                        "confidence": result["confidence_score"],
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
