import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app import chroma
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

    # Probe ChromaDB without blocking startup. A slow or unreachable vector
    # store must never prevent the API (and /health) from coming up.
    try:
        ok = await asyncio.wait_for(asyncio.to_thread(chroma.ping), timeout=10)
        if ok:
            await asyncio.to_thread(chroma.get_collection)
            logger.info("ChromaDB connection verified")
        else:
            logger.warning("ChromaDB heartbeat failed; starting in degraded mode")
    except Exception as exc:
        logger.warning("ChromaDB probe errored; starting in degraded mode", error=str(exc))

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


@app.get("/", tags=["health"])
async def root():
    return {"service": "support-agent", "status": "running"}


@app.get("/health", tags=["health"])
async def health():
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    try:
        chroma_ok = await asyncio.wait_for(asyncio.to_thread(chroma.ping), timeout=5)
    except Exception:
        chroma_ok = False

    return {
        "status": "ok" if db_ok and chroma_ok else "degraded",
        "db": "connected" if db_ok else "unreachable",
        "chroma": "connected" if chroma_ok else "unreachable",
    }
