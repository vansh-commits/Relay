#!/usr/bin/env bash
set -e

echo "[start] running database migrations..."
alembic upgrade head
echo "[start] migrations complete, launching uvicorn on port ${PORT:-8080}"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8080}"
