# rag-kit

A beginner-friendly, modular **RAG starter** using React, ASP.NET Core, Python,
Qdrant and Gemini. Clone it, add a Gemini key, drop in a PDF, and you have a
working retrieval-augmented chat you can pull apart and rebuild.

```
React  ──HTTP──▶  ASP.NET Core  ──HTTP──▶  Python RAG  ──▶  Qdrant + Gemini
(frontend/)        (backend/)              (rag/)
```

React never calls Python directly. The .NET backend is the API layer; Python
does the RAG work; React is just the UI.

## Repository layout

| Folder | What it is | Docs |
|--------|-----------|------|
| [`rag/`](rag/) | The Python RAG pipeline (11 steps) + a FastAPI service. Runs on its own. | [`rag/README.md`](rag/README.md) |
| [`backend/`](backend/) | ASP.NET Core Web API. Forwards chat + uploads to the Python service. | below |
| [`frontend/`](frontend/) | React + TypeScript + Vite. Upload a PDF, ask questions, see sources. | below |
| [`docs/`](docs/) | One short guide per pipeline stage — what / why / how / where the code is. | [`docs/README.md`](docs/README.md) |

## Quick start with Docker

One command brings up all four services (Qdrant runs as a server, so PDF uploads
in the UI index immediately):

```bash
cp .env.example .env            # then paste your Gemini API key
docker compose up --build
```

Open <http://localhost:5173>. Full walkthrough: [`docs/installation.md`](docs/installation.md).

## Run it by hand (three terminals)

### 1. Python RAG service

```bash
cd rag
python3.11 -m venv venv                               # use 3.11/3.12; 3.13+ has no torch wheels
venv\Scripts\activate                                 # Linux/macOS: source venv/bin/activate
pip install -r requirements.txt                       # local embeddings: also -r requirements-local.txt
copy .env.example .env                                # then paste your Gemini API key
docker run -p 6333:6333 -v qdrant_storage:/qdrant/storage qdrant/qdrant   # Qdrant server (normal mode)
python ingest.py --pdf data/your.pdf --recreate       # optional seed (UI upload also works)
uvicorn main:app --port 8000                          # serve GET /health, POST /query, POST /ingest
```

No Docker? Set `QDRANT_PATH=qdrant_data` in `rag/.env` for the embedded on-disk
fallback — then add PDFs with `python ingest.py` (UI upload needs the server).
See [`rag/README.md`](rag/README.md) and [`docs/embeddings.md`](docs/embeddings.md)
for embedding options and [`docs/qdrant.md`](docs/qdrant.md) for the two modes.

### 2. .NET backend

```bash
cd backend
dotnet run                                            # http://localhost:5038
```

Reads its settings from `appsettings.json` (`Rag:BaseUrl` points at the Python
service). Override with env vars if needed — see [`backend/.env.example`](backend/.env.example).

Endpoints:

| Method + path | Purpose | Calls |
|---------------|---------|-------|
| `GET /api/health` | Is the backend up? Is the RAG service reachable? | Python `GET /health` |
| `POST /api/chat` | `{ "question": "...", "topK": 4 }` → `{ answer, sources[] }` | Python `POST /query` |
| `POST /api/documents/upload` | multipart `file=<pdf>` → `{ document, pages, chunks }` | Python `POST /ingest` (raw stream) |

> `POST /api/documents/upload` needs Qdrant in **server mode** (normal mode; the
> Python service can't write to embedded on-disk Qdrant while it's running).
> Max size is `Upload:MaxBytes` (200 MB default); scanned PDFs are rejected with
> a clear message. Falling back to embedded Qdrant? Index with `python ingest.py`.

### 3. React frontend

```bash
cd frontend
npm install
copy .env.example .env                                # VITE_API_URL defaults to http://localhost:5038
npm run dev                                           # http://localhost:5173
```

## Configuration

Nothing is hard-coded; every service reads its own config file:

| Service | File | Key settings |
|---------|------|--------------|
| Python | `rag/.env` | `GOOGLE_API_KEY`, `EMBEDDING_PROVIDER`/`EMBEDDING_MODEL`, `QDRANT_URL` (+ `QDRANT_PATH` for the fallback), `CHUNK_SIZE`, `TOP_K`, `LLM_MODEL`, `MAX_UPLOAD_MB` |
| .NET | `backend/appsettings.json` | `Rag:BaseUrl`, `Rag:TimeoutSeconds`, `Upload:MaxBytes`, `Cors:Origins` |
| React | `frontend/.env` | `VITE_API_URL`, `VITE_MAX_UPLOAD_MB` |

Never commit `.env`, API keys, `venv/`, `node_modules/`, `bin/`, `obj/`, or
private PDFs. Each folder has a `.env.example` to copy from.

Full reference: [`docs/configuration.md`](docs/configuration.md).

## Documentation

| Guide | Covers |
|-------|--------|
| [installation](docs/installation.md) | Docker and by-hand setup, verifying the install |
| [configuration](docs/configuration.md) | Every environment variable, per service |
| [architecture](docs/architecture.md) | Why React → .NET → Python, and the API contract |
| [rag-pipeline](docs/rag-pipeline.md) | The 11 steps end to end |
| [ingestion](docs/ingestion.md) | Steps 1–4: PDF → text → clean → chunk + metadata |
| [embeddings](docs/embeddings.md) | Step 5: Gemini vs local models, why `--recreate` |
| [qdrant](docs/qdrant.md) | Step 6: embedded vs server mode, dimension handling |
| [retrieval](docs/retrieval.md) | Steps 8–11: search → context → Gemini → answer + sources |
| [backend-connection](docs/backend-connection.md) | The ASP.NET Core layer |
| [frontend-connection](docs/frontend-connection.md) | The React UI |
| [troubleshooting](docs/troubleshooting.md) | Symptom → cause → fix, per stage |
