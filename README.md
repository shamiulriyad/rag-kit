# rag-kit — RAG Starter

A commercial-style, multi-tenant **RAG Starter** SaaS: accounts, Knowledge Bases,
PDF documents, chat with citations, usage/plan limits, teams, billing (mocked),
notifications, activity logs and analytics — built on React, ASP.NET Core,
Python, Qdrant, Gemini and Postgres (Supabase-compatible).

```
React  ──HTTP──▶  ASP.NET Core API  ──HTTP──▶  Python RAG service  ──▶  Qdrant (per-KB collections) + Gemini
(frontend/)        (backend/)                   (rag/)                          │
                          │                                                     │
                          └──────────────────────▶  Postgres (Supabase) + Supabase Storage
```

**Clone → Configure → Ingest → Ask.** React never calls Python, Qdrant or
Gemini directly — the .NET backend is the sole API gateway and owns
authentication/authorization; Python owns RAG processing; Postgres holds
application data; Supabase Storage (or local disk in dev) holds PDFs; Qdrant
holds embeddings, one collection per Knowledge Base.

## Repository layout

| Folder | What it is | Docs |
|--------|-----------|------|
| [`backend/`](backend/) | ASP.NET Core Web API — auth, Knowledge Bases, documents, chat, billing, teams, analytics, etc. The only thing React talks to. | below |
| [`rag/`](rag/) | Python FastAPI RAG service — extraction, cleaning, chunking, embedding, retrieval, generation. One Qdrant collection per Knowledge Base. | [`rag/README.md`](rag/README.md), [`docs/`](docs/) |
| [`frontend/`](frontend/) | React + TypeScript + Vite. Dashboard, Knowledge Bases, documents, chat, billing, team, settings. | below |
| [`docs/`](docs/) | Deep dives on the RAG pipeline itself (extraction/chunking/embedding/retrieval) — still accurate; written before the multi-tenant API existed, so treat collection/endpoint names there as the single-document CLI story. | [`docs/README.md`](docs/README.md) |

## Quick start with Docker

```bash
cp .env.example .env
# then edit .env: GOOGLE_API_KEY (required), DATABASE_CONNECTION_STRING (a Supabase
# or any Postgres connection string - required for accounts/data to persist), JWT_SECRET
docker compose up --build
```

Open <http://localhost:5173>, register an account, create a Knowledge Base,
upload a PDF, ask questions. Supabase Storage is optional in dev — leave
`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` blank and uploaded PDFs are kept on a
local-disk volume instead (see `backend/Integrations/Supabase/LocalDiskStorageService.cs`).

Postgres itself is **not** run in Docker here — the backend expects a real
Supabase (or any Postgres) connection string, per the spec's "Supabase stays an
external hosted service" rule. Without one, the containers still start (so you
can see they're alive) but every database-backed endpoint returns an error
until `DATABASE_CONNECTION_STRING` is set.

## Run it by hand (three terminals)

### 1. Python RAG service

```bash
cd rag
python3.11 -m venv venv                               # use 3.11/3.12; 3.13+ has no torch wheels
venv\Scripts\activate                                 # Linux/macOS: source venv/bin/activate
pip install -r requirements.txt                       # local embeddings: also -r requirements-local.txt
copy .env.example .env                                # then paste your Gemini API key
docker run -p 6333:6333 -v qdrant_storage:/qdrant/storage qdrant/qdrant   # Qdrant server (required)
uvicorn main:app --port 8000
```

The real product flow needs Qdrant in **server mode** (`QDRANT_URL`, empty
`QDRANT_PATH`) — a collection is created per Knowledge Base on first upload, and
an embedded/on-disk store only allows one open handle, so a running service
can't write to it. With `QDRANT_PATH` set, `/api/kb/...` returns `501` and only
the single-document CLI fallback works:

```bash
python ingest.py --pdf data/your.pdf --recreate       # steps 1-6, one global collection
python ask.py "your question"                         # steps 7-11, interactive if no arg
```

### 2. .NET backend

```bash
cd backend
dotnet ef database update    # apply migrations (needs DATABASE_CONNECTION_STRING reachable)
dotnet run                   # http://localhost:5038, http://localhost:5038/swagger
```

Reads settings from `appsettings.json` / `appsettings.Development.json`, overridable
by environment variables (`Section__Key`) — see [`backend/.env.example`](backend/.env.example).
Without `DATABASE_CONNECTION_STRING` or `Jwt__Secret` set, the backend still starts
(a random JWT secret is generated per-process, and `/api/health` reports the database
as unhealthy) so you always get a running process to debug against.

Full endpoint list: run the backend and open `/swagger` (grouped by Auth, Users,
Knowledge Bases, Documents, Chat, Billing, Teams, Notifications, Settings,
Activity, Analytics, Health). Summary:

| Area | Endpoints |
|------|-----------|
| Auth | `POST /api/auth/{register,login,refresh,logout}` |
| Users | `GET/PUT /api/users/me`, `PUT /api/users/me/password`, `GET/POST/DELETE /api/api-keys` |
| Knowledge Bases | `GET/POST /api/knowledge-bases`, `GET/PUT/DELETE /api/knowledge-bases/{id}`, `GET /api/knowledge-bases/{id}/stats`, member CRUD |
| Documents | `GET/POST /api/knowledge-bases/{id}/documents`, `GET/DELETE /api/documents/{id}`, `POST /api/documents/{id}/reprocess` |
| Chat | `POST/GET /api/chat/sessions`, `GET/DELETE /api/chat/sessions/{id}`, `POST /api/chat/sessions/{id}/messages`, `GET /api/chat-history`, `GET /api/chat-history/search`, `PUT/DELETE /api/chat-history/{id}` |
| Billing | `GET /api/billing/{plans,subscription,usage}`, `POST /api/billing/mock-activate` (dev-only, no payment provider yet) |
| Teams | `GET/POST/PUT/DELETE /api/workspaces`, member invite (mocked email)/remove |
| Notifications | `GET /api/notifications`, `PUT .../{id}/read`, `PUT .../read-all` |
| Settings | `GET/PUT /api/settings` (chunk size/overlap, top-k, similarity threshold, temperature, models) |
| Activity | `GET/DELETE /api/activity` |
| Analytics | `GET /api/analytics/{overview,questions,documents,usage}` |
| Health | `GET /api/health` → `{ api, database, rag, qdrant }` |

Every response is `{ success, data?, message?, errors? }`. Every protected
endpoint requires `Authorization: Bearer <accessToken>` from `/api/auth/login`;
the id used for ownership checks always comes from the JWT, never the request body.

### 3. React frontend

```bash
cd frontend
npm install
copy .env.example .env                                # VITE_API_URL defaults to http://localhost:5038
npm run dev                                           # http://localhost:5173
```

The frontend ships with rich mock data (Knowledge Bases, chat history, team,
billing) so it's usable standalone. `services/api.ts` is the only file that
calls the backend today (health/upload/chat) — wiring the rest of the pages to
the new endpoints above (matching DTOs shapes to `lib/appData.ts`/`mockData.ts`/
`plan.ts`) is the natural next step and was scoped as a backend-first pass.

## Configuration

| Service | File | Key settings |
|---------|------|--------------|
| .NET | `backend/appsettings.json` + env | `DATABASE_CONNECTION_STRING`, `Jwt__Secret`, `Supabase__*`, `Rag__BaseUrl`, `Upload__MaxBytes`, `Cors__Origins` |
| Python | `rag/.env` | `GOOGLE_API_KEY`, `EMBEDDING_PROVIDER`/`EMBEDDING_MODEL`, `QDRANT_URL` (+ `QDRANT_PATH` for the CLI-only fallback), `MAX_UPLOAD_MB` |
| React | `frontend/.env` | `VITE_API_URL`, `VITE_MAX_UPLOAD_MB` |

Never commit `.env`, API keys, `venv/`, `node_modules/`, `bin/`, `obj/`, or
private PDFs. Each folder has a `.env.example` to copy from. Full pipeline-level
reference: [`docs/configuration.md`](docs/configuration.md).

## Architecture notes

- **Database**: Postgres via EF Core/Npgsql (`backend/Data/`), Supabase-hosted in
  production. No PDF binaries or embeddings ever go in Postgres.
- **Storage**: `IStorageService` abstraction — Supabase Storage in production,
  local disk automatically in dev when Supabase isn't configured. Swappable for
  S3-compatible storage later without touching callers.
- **Vectors**: one Qdrant collection per Knowledge Base (`kb_<guid>`) — the
  simpler and safer of the two strategies the spec allows, since a query can
  never accidentally cross a metadata filter into another tenant's data.
- **Auth**: JWT (access + rotating refresh tokens), BCrypt password hashes, role
  checks (`Owner`/`Admin`/`Member`) on every Knowledge Base/Workspace resource.
  The caller's id always comes from JWT claims, never the request body.
- **Billing/teams/email**: architecturally present (schema, endpoints,
  separation from core logic) but Stripe, real invitation email, and OCR for
  scanned PDFs are intentionally not implemented yet — marked future-ready per
  the spec, not faked.
- Full class-level docs are in each file's XML doc comments; start at
  `backend/Program.cs` for the wiring and `rag/main.py` for the Python API.

## Documentation

| Guide | Covers |
|-------|--------|
| [installation](docs/installation.md) | Docker and by-hand setup (pipeline-level; predates multi-tenant auth) |
| [configuration](docs/configuration.md) | Every Python/Qdrant environment variable |
| [architecture](docs/architecture.md) | The original single-document React → .NET → Python contract |
| [rag-pipeline](docs/rag-pipeline.md) | The 11 pipeline steps end to end |
| [ingestion](docs/ingestion.md) | Steps 1–4: PDF → text → clean → chunk + metadata |
| [embeddings](docs/embeddings.md) | Step 5: Gemini vs local models, why re-ingesting is needed after a model change |
| [qdrant](docs/qdrant.md) | Step 6: embedded vs server mode, dimension handling |
| [retrieval](docs/retrieval.md) | Steps 8–11: search → context → Gemini → answer + sources |
| [troubleshooting](docs/troubleshooting.md) | Symptom → cause → fix, per stage |
