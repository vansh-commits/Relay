"""Shared ChromaDB client.

A single lazily-constructed HttpClient is reused across the app. This module
adds thread-safe lazy initialization and short-lived ping caching (TTL 5s)
to avoid spawning blocking threads on every health check.
"""
import threading
import time
from typing import Optional

import chromadb

from app.config import settings

# Protected by _init_lock
_client: Optional[chromadb.HttpClient] = None
_collection = None
_init_lock = threading.Lock()

# Ping cache to avoid hammering the vector store on frequent health checks.
_LAST_PING_AT = 0.0
_LAST_PING_OK: Optional[bool] = None
_PING_TTL = 5.0  # seconds


def get_client():
    """Return a shared, lazily-initialized Chroma HttpClient.

    Thread-safe: multiple concurrent first-call attempts are serialized by a lock.
    This keeps the function synchronous so it can be used from threads or
    asyncio.to_thread without changing callers.
    """
    global _client
    if _client is not None:
        return _client

    # Only one thread should create the client.
    with _init_lock:
        if _client is None:
            _client = chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)
    return _client


def get_collection():
    """Return a cached collection object, creating it once if needed.

    Caching avoids calling get_or_create_collection repeatedly (which may be
    an expensive HTTP operation). Initialization is protected by the same lock.
    """
    global _collection
    if _collection is not None:
        return _collection

    client = get_client()
    with _init_lock:
        if _collection is None:
            # Keep the same metadata as before.
            _collection = client.get_or_create_collection(
                "knowledge_base", metadata={"hnsw:space": "cosine"}
            )
    return _collection


def ping() -> bool:
    """Return True if ChromaDB heartbeat succeeds, False otherwise.

    This function is synchronous (to preserve the existing API) but caches the
    most recent result for a short TTL to avoid blocking thread creation on
    every health check. The cache is protected by the same initialization lock.
    """
    global _LAST_PING_AT, _LAST_PING_OK

    now = time.time()
    # Return cached value if within TTL
    if _LAST_PING_OK is not None and (now - _LAST_PING_AT) < _PING_TTL:
        return _LAST_PING_OK

    try:
        # heartbeat() is synchronous in the client; callers will typically use
        # asyncio.to_thread(chroma.ping) to run it without blocking the event loop.
        get_client().heartbeat()
        ok = True
    except Exception:
        ok = False

    with _init_lock:
        _LAST_PING_OK = ok
        _LAST_PING_AT = now

    return ok
