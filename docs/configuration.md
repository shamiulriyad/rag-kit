# Configuration

**Principle:** nothing is hard-coded. Every knob is an environment variable, and
each service reads its own file. You should never edit source to reconfigure.

| Service | File to copy | Read by |
|---------|--------------|---------|
| Python RAG | [`rag/.env.example`](../rag/.env.example) → `rag/.env` | [`rag/config.py`](../rag/config.py) |
| .NET backend | [`backend/.env.example`](../backend/.env.example) (optional) | `appsettings.json` + env vars, bound in [`backend/Program.cs`](../backend/Program.cs) |
| React frontend | [`frontend/.env.example`](../frontend/.env.example) → `frontend/.env` | `import.meta.env` in [`frontend/src/services/api.ts`](../frontend/src/services/api.ts) |
| Docker (all) | [`.env.example`](../.env.example) → `.env` | [`docker-compose.yml`](../docker-compose.yml) |

---

## Python RAG — `rag/.env`

Every value below has a default in `config.py`; you only set what you want to change.

| Variable | Default | What it does | Step |
|----------|---------|--------------|------|
| `GOOGLE_API_KEY` | *(required)* | Gemini key for the LLM and (by default) embeddings | 5, 10 |
| `PDF_PATH` | `data/sample.pdf` | Which PDF `python ingest.py` uses when `--pdf` is omitted. Relative paths anchor to `rag/`. | 1 |
| `CHUNK_SIZE` | `1000` | Target characters per chunk | 4 |
| `CHUNK_OVERLAP` | `150` | Characters shared between neighbouring chunks | 4 |
| `EMBEDDING_PROVIDER` | `google` | `google` or `huggingface` | 5 |
| `EMBEDDING_MODEL` | `gemini-embedding-001` | Model for the provider above | 5 |
| `EMBEDDING_DIM` | *(auto)* | Force a vector size. Leave empty to detect it. | 5 |
| `EMBED_BATCH_SIZE` | `90` | Texts per embed call (Gemini caps at 100) | 6 |
| `EMBED_SLEEP` | `60` (google) / `0` | Seconds to pause between batches, to dodge the free-tier rate limit | 6 |
| `QDRANT_PATH` | `qdrant_data` | Embedded on-disk store. **Set = embedded mode.** | 6 |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant server URL. Used only when `QDRANT_PATH` is empty. | 6 |
| `QDRANT_API_KEY` | *(none)* | For a secured Qdrant server / Qdrant Cloud | 6 |
| `COLLECTION_NAME` | `pdf_rag` | Qdrant collection name | 6 |
| `TOP_K` | `4` | How many chunks to retrieve per question | 9 |
| `LLM_MODEL` | `gemini-2.5-flash` | Gemini chat model | 10 |
| `TEMPERATURE` | `0.2` | LLM sampling temperature (lower = more literal) | 10 |

**Changing the embedding model** (`EMBEDDING_PROVIDER` or `EMBEDDING_MODEL`)
requires re-ingesting with `--recreate` — vectors from two models are not
comparable and usually differ in size. The kit records the model that built the
collection in `rag/.rag_index_meta.json` and refuses to query or append if `.env`
no longer matches. See [embeddings.md](embeddings.md).

---

## .NET backend — `appsettings.json` (or env vars)

| Setting | Env var override | Default | What it does |
|---------|------------------|---------|--------------|
| `Rag:BaseUrl` | `Rag__BaseUrl` | `http://localhost:8000` | Where the Python RAG service is |
| `Rag:TimeoutSeconds` | `Rag__TimeoutSeconds` | `600` | How long to wait on Python (embedding a big PDF is slow) |
| `Cors:Origins:0` | `Cors__Origins__0` | `http://localhost:5173` | Allowed browser origin for the API |

The separator for nested keys in an env var is `__` (double underscore). There is
no `.env` loader — `backend/.env.example` just documents the variable names.

---

## React frontend — `frontend/.env`

| Variable | Default | What it does |
|----------|---------|--------------|
| `VITE_API_URL` | `http://localhost:5038` | Base URL of the **.NET backend**. The frontend never calls Python directly. |

Vite inlines this at **build** time, not run time. In Docker it is a build arg in
`docker-compose.yml`, and it must be the URL the *browser* uses (the host-published
backend port), not a compose service name.

---

## Docker — root `.env`

Only `GOOGLE_API_KEY` is required. `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`,
`COLLECTION_NAME`, `LLM_MODEL`, `CHUNK_SIZE`, `CHUNK_OVERLAP`, `TOP_K` are optional
overrides passed through to the `rag` container. `docker-compose.yml` additionally
forces `QDRANT_URL=http://qdrant:6333` and clears `QDRANT_PATH`, so Qdrant runs in
server mode inside compose.

---

## What never goes in git

`.env`, API keys, `venv/`, `node_modules/`, `bin/`, `obj/`, `qdrant_data/` /
`qdrant_storage/`, and private PDFs (`rag/data/*.pdf`). All are in
[`.gitignore`](../.gitignore). Copy from the `.env.example` files instead.
