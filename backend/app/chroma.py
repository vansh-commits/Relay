"""Shared ChromaDB client.

A single lazily-constructed HttpClient is reused across the app. The client is
created on first use rather than at import time so that a slow or unreachable
ChromaDB never blocks process startup.
"""
import chromadb

from app.config import settings

_client = None


def get_client():
    global _client
    if _client is None:
        _client = chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)
    return _client


def get_collection():
    return get_client().get_or_create_collection(
        "knowledge_base", metadata={"hnsw:space": "cosine"}
    )


def ping() -> bool:
    """Return True if ChromaDB responds to a heartbeat, False otherwise."""
    try:
        get_client().heartbeat()
        return True
    except Exception:
        return False
