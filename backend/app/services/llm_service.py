"""Text generation via Groq.

Generation runs on Groq (free, generous quota) while embeddings stay on
Gemini's text-embedding-004 (see gemini_service). Splitting the two keeps
the RAG pipeline working even when one provider's quota is constrained.
"""
from groq import AsyncGroq

from app.config import settings


class LLMService:
    def __init__(self):
        self._client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        self._model = settings.GROQ_MODEL

    async def chat(self, prompt: str) -> str:
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        return response.choices[0].message.content or ""


llm_service = LLMService()
