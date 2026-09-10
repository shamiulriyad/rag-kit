# Installation

Two ways to run the kit: **Docker** (one command, nothing to install but Docker)
or **by hand** (three terminals, full control).

---

## What you need either way

- A **Gemini API key** — free from <https://aistudio.google.com/app/apikey>.
  It is used for the LLM (step 10) and, by default, for embeddings (step 5).

---

## Option A — Docker (recommended for a first run)

**What:** `docker-compose.yml` builds and starts four containers — `qdrant`,
`rag` (Python), `backend` (.NET), `frontend` (nginx).

```bash
git clone <this-repo> rag-kit && cd rag-kit
cp .env.example .env            # then edit .env and paste your Gemini key
docker compose up --build
```

Open <http://localhost:5173>, upload a PDF, ask a question.

| Service | URL | Notes |
|---------|-----|-------|
| frontend | <http://localhost:5173> | the page you use |
| backend  | <http://localhost:5038> | React talks to this |
| rag      | <http://localhost:8000> | FastAPI; `/docs` for the OpenAPI UI |
| qdrant   | <http://localhost:6333> | vector DB (server mode) |

**Why Docker "just works" for uploads:** compose runs Qdrant as a *server*, so
uploading a PDF in the UI indexes it immediately. Running by hand, you get the
same by pointing `QDRANT_URL` at a Qdrant server (see below); the embedded
on-disk fallback can't accept UI uploads — see [qdrant.md](qdrant.md).

**How to change it:** ports, the embedding model and the API key all come from
`.env` and `docker-compose.yml`. See [configuration.md](configuration.md).

**Local embedding models in Docker:** the `rag` image installs only
`requirements.txt` (no torch). To use `EMBEDDING_PROVIDER=huggingface`, uncomment
the `requirements-local.txt` lines in [`rag/Dockerfile`](../rag/Dockerfile) and
rebuild.

---

## Option B — By hand (three terminals)

### 1. Python RAG service — [`rag/`](../rag/)

Use **Python 3.11 or 3.12**. `torch` / `sentence-transformers` (the optional
local-embedding path) have no wheels for 3.13+ yet, and the system Python here is
3.14 — so create the venv explicitly with 3.11.

```bash
cd rag
python3.11 -m venv venv
venv\Scripts\activate                 # Windows
# source venv/bin/activate            # Linux / macOS
pip install -r requirements.txt
# optional, only for local embeddings:
# pip install -r requirements-local.txt
cp .env.example .env                  # paste your Gemini key

# Qdrant server (normal mode - lets the UI upload work). Leave this running:
docker run -p 6333:6333 -v qdrant_storage:/qdrant/storage qdrant/qdrant

python ingest.py --pdf data/your.pdf --recreate    # optional seed; UI upload also works
uvicorn main:app --port 8000
```

No Docker at all? Set `QDRANT_PATH=qdrant_data` in `rag/.env` for the embedded
on-disk fallback. Then add PDFs with `python ingest.py` — the UI upload button
will return a clear "needs server mode" message.

### 2. .NET backend — [`backend/`](../backend/)

Needs the **.NET 10 SDK**.

```bash
cd backend
dotnet run                            # http://localhost:5038
```

Settings come from `appsettings.json`; override with `Rag__BaseUrl` etc. if the
Python service is elsewhere (see [`backend/.env.example`](../backend/.env.example)).

### 3. React frontend — [`frontend/`](../frontend/)

Needs **Node 20+**.

```bash
cd frontend
npm install
cp .env.example .env                  # VITE_API_URL defaults to http://localhost:5038
npm run dev                           # http://localhost:5173
```

---

## Verifying the install

| Check | Command / URL | Expected |
|-------|---------------|----------|
| Python up | `curl http://localhost:8000/health` | `{"status":"ok","ready":true}` |
| Backend up | `curl http://localhost:5038/api/health` | `{"status":"ok","rag":"ok"}` |
| Frontend up | open <http://localhost:5173> | the "RAG Starter" page, status "connected" |

If any step fails, [troubleshooting.md](troubleshooting.md) is organised by
symptom.
