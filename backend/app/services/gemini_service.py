import asyncio

import google.generativeai as genai

from app.config import settings


class GeminiService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self._chat_model = genai.GenerativeModel(settings.GEMINI_CHAT_MODEL)
        self._embed_model = settings.GEMINI_EMBED_MODEL

    async def chat(self, prompt: str) -> str:
        response = await asyncio.to_thread(self._chat_model.generate_content, prompt)
        return response.text

    async def embed_single(self, text: str) -> list[float]:
        result = await asyncio.to_thread(
            genai.embed_content,
            model=self._embed_model,
            content=text,
            task_type="retrieval_query",
        )
        return result["embedding"]

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        embeddings: list[list[float]] = []
        for i in range(0, len(texts), 100):
            batch = texts[i : i + 100]
            result = await asyncio.to_thread(
                genai.embed_content,
                model=self._embed_model,
                content=batch,
                task_type="retrieval_document",
            )
            batch_embeddings = result["embedding"]
            # embed_content returns a list of embeddings for batch input
            if isinstance(batch_embeddings[0], list):
                embeddings.extend(batch_embeddings)
            else:
                embeddings.append(batch_embeddings)
        return embeddings


gemini_service = GeminiService()
