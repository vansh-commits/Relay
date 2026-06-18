# Relay

**Customer support that knows when to step aside.**

Relay is an AI-powered customer support agent. It answers questions from a private knowledge base using Retrieval-Augmented Generation (RAG), remembers the conversation across turns, and—crucially—**escalates to a human the moment it isn't confident**, handing over a full summary instead of guessing. It ships with a live chat interface, an admin analytics panel, a knowledge-base manager, and a human escalation queue.

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)
- [API reference](#api-reference)

---

## Features

- **RAG knowledge base** — ingest PDFs, Markdown, or web URLs; text is chunked, embedded, and stored in a vector database for semantic retrieval.
- **Multi-turn memory** — each conversation keeps its history so follow-up questions work without repeating context.
- **Confidence-based escalation** — every answer carries a confidence score; low-confidence or out-of-scope queries are escalated to a human queue automatically, with no wasted AI call.
- **Live chat** — real-time WebSocket chat with typing indicators and reconnection.
- **Human handoff** — when escalated, the customer can keep messaging the specialist; resolving the ticket pushes the resolution back into the chat and starts a fresh session.
- **Authentication** — email + password (JWT) or a guest mode with a free-question quota.
- **Admin panel** — analytics dashboard (query volume, resolution rate, escalation reasons, top unanswered questions), live system health, knowledge-base manager, and the escalation queue.
- **Feedback loop** — thumbs up/down on answers for quality tracking.

---

## Architecture

```
                    ┌─────────────────┐         ┌──────────────────────┐
   Browser  ───────▶│   Next.js (UI)  │────────▶│   FastAPI (backend)  │
  (chat + admin)    │   Vercel        │  REST + │   Railway            │
                    └─────────────────┘   WS    └───────┬──────┬───────┘
                                                        │      │
                                          embeddings +  │      │  vectors
                                          generation    │      │
                                                ┌───────▼──┐ ┌─▼─────────┐
                                                │  Gemini  │ │ ChromaDB  │
                                                │   API    │ │ (vectors) │
                                                └──────────┘ └───────────┘
                                                        │
                                                ┌───────▼──────┐
                                                │ PostgreSQL   │
                                                │ (app data)   │
                                                └──────────────┘
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts, SWR |
| Backend | FastAPI, Python 3.11, async SQLAlchemy, Alembic |
| AI | Google Gemini — `gemini-2.0-flash` / `gemini-3.5-flash` (generation) + `text-embedding-004` / `gemini-embedding-001` (embeddings) |
| Vector DB | ChromaDB (cosine similarity) |
| Database | PostgreSQL 16 |
| Realtime | Native WebSockets |
| Auth | JWT (PyJWT) + bcrypt |
| Deployment | Vercel (frontend) + Railway (backend, Postgres, ChromaDB) |

---

## How it works

**Ingestion**
1. A source (PDF / Markdown / URL) is uploaded in the admin panel.
2. Text is extracted, split into ~500-char overlapping chunks, embedded with Gemini, and upserted into ChromaDB with metadata.

**Answering a question**
1. The user's message is embedded and matched against ChromaDB. The closest match gives a **confidence score** = `1.0 − cosine distance`.
2. **If confidence is below the threshold** (default `0.4`) → escalate immediately, *skipping* the generation call.
3. Otherwise, the retrieved context + recent history are sent to Gemini, which answers **only** from that context.
4. If the answer signals it doesn't know ("out of scope"), it escalates too.

**Escalation → resolution**
1. An escalation row is created (with a templated handoff summary) and the conversation is flagged `escalated`.
2. The chat switches to "specialist" mode; the customer can keep messaging (the AI stays silent).
3. An agent assigns and resolves the ticket in the admin queue; the customer's chat updates live, shows the resolution, and a new session begins.

---

## Project structure

```
genAi-Proj/
├── backend/                # FastAPI app
│   ├── app/
│   │   ├── main.py         # app, CORS, lifespan, /health
│   │   ├── config.py       # env-driven settings
│   │   ├── chroma.py       # shared ChromaDB client
│   │   ├── models/         # SQLAlchemy models
│   │   ├── routers/        # auth, chat (REST+WS), knowledge, escalation, feedback, analytics
│   │   └── services/       # gemini, rag, ingestion, escalation, analytics, auth
│   ├── alembic/            # migrations
│   ├── Dockerfile
│   └── start.sh            # migrate + serve
├── frontend/               # Next.js app
│   ├── app/                # chat (/) and admin (/admin/*) routes
│   ├── components/         # chat, admin, auth, ui
│   ├── hooks/              # useChat, useWebSocket, useAuth, useAnalytics
│   └── lib/                # api client, auth, types
├── docker-compose.yml      # local: postgres + chroma + backend + frontend
└── .env.example
```

---

## Local development

**Prerequisites:** Docker + Docker Compose, a Gemini API key.

```bash
# 1. Configure env
cp .env.example .env
#    set GEMINI_API_KEY and a JWT_SECRET

# 2. Start everything
docker compose up --build

# 3. Open
#    Chat:   http://localhost:3000
#    Admin:  http://localhost:3000/admin
#    API:    http://localhost:8080/docs
```

Run backend migrations manually (if not using compose):

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8080
```

---

## Environment variables

| Variable | Where | Description |
|---|---|---|
| `GEMINI_API_KEY` | backend | Gemini key (generation + embeddings) |
| `GEMINI_CHAT_MODEL` | backend | Generation model (default `gemini-2.0-flash`) |
| `GEMINI_EMBED_MODEL` | backend | Embedding model (default `models/text-embedding-004`) |
| `DATABASE_URL` | backend | Postgres URL — must use `postgresql+asyncpg://` |
| `CHROMA_HOST` / `CHROMA_PORT` | backend | ChromaDB host/port |
| `CONFIDENCE_THRESHOLD` | backend | Escalation threshold (default `0.4`) |
| `JWT_SECRET` | backend | **Required in prod** — long random string |
| `GUEST_QUESTION_LIMIT` | backend | Free questions for guests (default `4`) |
| `FRONTEND_URL` | backend | Allowed CORS origin (your Vercel URL) |
| `NEXT_PUBLIC_API_URL` | frontend | Backend base URL |

---

## Deployment

**Backend + databases — Railway**
1. Add **PostgreSQL** and **ChromaDB** (`chromadb/chroma`) services; attach a volume to ChromaDB at `/chroma/chroma`.
2. Add the **backend** service from this repo (root `backend/`). It builds via the Dockerfile and runs `start.sh` (migrate → serve).
3. Set the backend variables above. Point `CHROMA_HOST` at ChromaDB's private `.railway.internal` hostname, `CHROMA_PORT=8000`. Use the ChromaDB-capable Gemini key.
4. Generate a public domain for the backend (port `8080`).

**Frontend — Vercel**
1. Import the repo, root directory `frontend/`.
2. Set `NEXT_PUBLIC_API_URL` to the Railway backend URL.
3. Deploy. Then set the backend's `FRONTEND_URL` to the Vercel URL (CORS).

**Health check:** `GET /health` → `{"status":"ok","db":"connected","chroma":"connected"}`.

---

## API reference

Base path `/api/v1` (REST). WebSocket at root.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/auth/signup` · `/auth/login` · `/auth/guest` | Authentication, returns a JWT |
| `WS` | `/ws/chat/{session_id}?token=…` | Live chat |
| `POST` | `/knowledge/ingest` | Add a knowledge source |
| `GET` / `DELETE` | `/knowledge/sources` | List / remove sources |
| `GET` | `/escalations` | Escalation queue |
| `PUT` | `/escalations/{id}/assign` · `/resolve` | Work a ticket |
| `POST` | `/feedback` | Submit answer feedback |
| `GET` | `/analytics/*` | Dashboard data |
| `GET` | `/health` | Service health |

---

Built as a RAG + Agents project: knowledge-grounded answers, multi-turn memory, and confident human handoff.
