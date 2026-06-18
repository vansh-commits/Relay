from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.chroma import get_collection
from app.config import settings
from app.models.message import Message
from app.models.conversation import Conversation
from app.services.gemini_service import gemini_service


async def retrieve_context(query: str, n_results: int = 5) -> tuple[list[dict], float]:
    collection = get_collection()
    count = collection.count()
    if count == 0:
        return [], 0.0

    query_embedding = await gemini_service.embed_single(query)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(n_results, count),
        include=["documents", "metadatas", "distances"],
    )

    distances = results["distances"][0]
    confidence = round(1.0 - min(distances), 4) if distances else 0.0

    chunks = [
        {
            "text": doc,
            "source_name": meta.get("source_name", ""),
            "chunk_index": meta.get("chunk_index", 0),
            "distance": dist,
        }
        for doc, meta, dist in zip(results["documents"][0], results["metadatas"][0], distances)
    ]
    return chunks, confidence


async def get_conversation_history(session_id: str, db: AsyncSession, limit: int = 10) -> list[dict]:
    result = await db.execute(
        select(Message)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .where(Conversation.session_id == session_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    messages = result.scalars().all()
    return [{"role": m.role, "content": m.content} for m in reversed(messages)]


def _build_prompt(user_message: str, chunks: list[dict], history: list[dict]) -> str:
    context_text = "\n---\n".join(c["text"] for c in chunks) if chunks else "No relevant knowledge base content found."
    history_text = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in history) if history else ""

    return f"""You are a helpful customer support assistant.
Answer questions ONLY using the provided context below.
If the answer is not found in the context, respond with exactly:
"I don't have specific information about that in my knowledge base."
Do not make up information. Be concise and direct.

CONTEXT:
{context_text}

CONVERSATION HISTORY:
{history_text}

USER: {user_message}
A:"""


async def generate_answer(user_message: str, chunks: list[dict], history: list[dict]) -> str:
    """One Gemini generation call. Caller decides whether it's worth making."""
    prompt = _build_prompt(user_message, chunks, history)
    return await gemini_service.chat(prompt)
