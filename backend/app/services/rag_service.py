from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.chroma import get_collection
from app.config import settings
from app.models.message import Message
from app.models.conversation import Conversation
from app.services.gemini_service import gemini_service

_GREETINGS = {
    "hi", "hii", "hiya", "hey", "heya", "hello", "helo", "hey there", "hi there",
    "hello there", "yo", "sup", "greetings", "good morning", "good afternoon",
    "good evening", "howdy",
}
_HOW_ARE_YOU = {"how are you", "how are you doing", "how's it going", "hows it going", "what's up", "whats up"}
_THANKS = {"thanks", "thank you", "thankyou", "thx", "ty", "thanks a lot", "thank you so much", "thank u"}
_BYE = {"bye", "goodbye", "good bye", "see you", "see ya", "cya", "bye bye", "take care"}


def small_talk_reply(message: str) -> str | None:
    """Return a canned reply for greetings/pleasantries, else None.

    Keeps social messages out of RAG so they don't escalate (and cost no API call).
    """
    text = message.strip().lower().rstrip("!.?,")
    if text in _GREETINGS:
        return "Hi there! How can I help you today?"
    if text in _HOW_ARE_YOU:
        return "I'm doing well, thanks for asking! What can I help you with?"
    if text in _THANKS:
        return "You're welcome! Is there anything else I can help you with?"
    if text in _BYE:
        return "Thanks for chatting — have a great day!"
    return None


async def retrieve_context(query: str, n_results: int = 3) -> tuple[list[dict], float]:
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
