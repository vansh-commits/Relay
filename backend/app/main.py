from contextlib import asynccontextmanager

import chromadb
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.core.logging import setup_logging, logger
from app.database import async_session_factory, engine
from app.routers import chat, knowledge, escalation, feedback, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Starting support agent service")

    # Verify DB connectivity
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    logger.info("Database connection verified")

    # Verify ChromaDB connectivity and ensure collection exists
    chroma = chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)
    chroma.heartbeat()
    chroma.get_or_create_collection(
        name="knowledge_base",
        metadata={"hnsw:space": "cosine"},
    )
    logger.info("ChromaDB connection verified")

    yield

    await engine.dispose()
    logger.info("Shutdown complete")


app = FastAPI(
    title="Support Agent API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api/v1", tags=["chat"])
app.include_router(knowledge.router, prefix="/api/v1/knowledge", tags=["knowledge"])
app.include_router(escalation.router, prefix="/api/v1/escalations", tags=["escalations"])
app.include_router(feedback.router, prefix="/api/v1/feedback", tags=["feedback"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])


@app.get("/health", tags=["health"])
async def health():
    async with async_session_factory() as session:
        await session.execute(text("SELECT 1"))
    chroma = chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)
    chroma.heartbeat()
    return {"status": "ok", "db": "connected", "chroma": "connected"}
