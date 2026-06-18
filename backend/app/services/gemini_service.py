import asyncio
import re

import google.generativeai as genai

from app.config import settings
from app.core.logging import logger

# Keep answers short and avoid burning the free-tier tokens-per-minute budget
# (thinking models can otherwise spend hundreds of tokens per reply).
_GEN_CONFIG = {"max_output_tokens": 768, "temperature": 0.3}

# No retry on rate limits: a 429 means the free-tier window is exhausted, and
# retrying just burns more of the quota and slows the reply. Fail fast instead
# (the chat handler turns a 429 into a graceful "high demand" message).
_MAX_RETRIES = 1
_MAX_DELAY = 6


def _retry_delay_seconds(err: str, attempt: int) -> float:
    match = re.search(r"retry_delay\D+(\d+)", err) or re.search(r"retry in (\d+)", err)
    if match:
        return min(float(match.group(1)) + 1, _MAX_DELAY)
    return min(2 ** attempt, _MAX_DELAY)


class GeminiService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self._chat_model = genai.GenerativeModel(settings.GEMINI_CHAT_MODEL)
        self._embed_model = settings.GEMINI_EMBED_MODEL

    async def chat(self, prompt: str) -> str:
        for attempt in range(_MAX_RETRIES):
            try:
                response = await asyncio.to_thread(
                    self._chat_model.generate_content, prompt, generation_config=_GEN_CONFIG
                )
                return response.text
            except Exception as exc:
                err = str(exc)
                is_rate_limit = "429" in err or "quota" in err.lower() or "rate" in err.lower()
                if is_rate_limit and attempt < _MAX_RETRIES - 1:
                    delay = _retry_delay_seconds(err, attempt)
                    logger.warning("Gemini rate limited, retrying", attempt=attempt + 1, delay=delay)
                    await asyncio.sleep(delay)
                    continue
                raise

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
