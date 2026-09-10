# Qdrant — step 6

## What

Qdrant is a **vector database**: it stores each chunk's embedding plus its
metadata, and answers "give me the K vectors closest to this one" quickly. This
kit uses cosine similarity.

## Why RAG needs it

Once every chunk is a vector, retrieval is a nearest-neighbour search. You could
do that with a for-loop over a list for a tiny document, but a vector DB gives
you indexing, persistence, filtering by metadata, and it scales past memory.

## Where the code is

[`rag/rag/step06_vector_store.py`](../rag/rag/step06_vector_store.py)

| Function | Job |
|----------|-----|
| `get_client()` | open Qdrant — server (url) or embedded (path) |
| `detect_or_config_dim()` | vector size from step 5 (detected, not hard-coded) |
| `ensure_collection()` | create the collection at the right size, or detect a dimension mismatch |
| `_reset_local_storage()` | on `--recreate` in embedded mode, delete the on-disk folder first |
| `store_chunks()` | embed chunks in batches and upsert them; record the index metadata |
| `get_vector_store()` | the read-side handle used by step 9 |

## Two ways to run Qdrant

| Mode | Set in `.env` | UI upload (`POST /ingest`) | When |
|------|---------------|-----------------------------|------|
| **Server** *(normal mode)* | `QDRANT_URL=...`, `QDRANT_PATH` empty | ✅ works | the app — Docker, or a local `docker run` |
| Embedded on-disk *(fallback)* | `QDRANT_PATH=qdrant_data` | ✗ 501 — use `python ingest.py` | quick CLI-only experiments, no server to run |

`QDRANT_PATH` wins: if it is set, `QDRANT_URL` is ignored.

**Why server mode is the normal mode:** embedded Qdrant allows only one open
handle to the on-disk store. While `uvicorn main:app` holds it to answer
`/query`, it cannot also open it for writing — so an upload can never be indexed.
A standalone server accepts many clients at once, so the running service reads
*and* writes, and the UI upload works end to end.

### Get a server

```bash
# Docker Compose (recommended) - starts Qdrant + all services
docker compose up --build

# or just Qdrant, for local by-hand dev
docker run -p 6333:6333 -v qdrant_storage:/qdrant/storage qdrant/qdrant
```

Then in `rag/.env`: `QDRANT_URL=http://localhost:6333` (or `http://qdrant:6333`
inside Compose) and leave `QDRANT_PATH` empty.

## How the vector size is handled

Never hard-coded. Step 5 embeds a probe string, step 6 creates the collection
with `VectorParams(size=<detected>, distance=COSINE)`. If a collection already
exists at a **different** size, `ensure_collection()` raises:

```
Qdrant dimension mismatch: collection 'pdf_rag' stores 384-dim vectors,
but the current embedding model produces 3072-dim vectors.
Rebuild it with the new model:
    python ingest.py --recreate
```

## The `--recreate` gotcha (embedded mode only)

In embedded mode, `delete_collection()` clears the registry entry but **leaves
`qdrant_data/collection/<name>/storage.sqlite` on disk**, and the next
`create_collection()` re-attaches to that stale file — so a re-ingest *appends*
(1306 → 2612 → 3918 chunks) and a dimension change breaks inserts. So
`store_chunks()` calls `_reset_local_storage()` **before opening any client** on
`--recreate`, physically removing the folder. Server mode does not have this
problem — there `delete_collection()` is enough. Always pass `--recreate` when
you change the model or the PDF.

## How to change it

| Want to… | Do |
|----------|-----|
| Use Qdrant Cloud | set `QDRANT_URL` to the cluster URL + `QDRANT_API_KEY`, leave `QDRANT_PATH` empty |
| Rename the collection | `COLLECTION_NAME` in `.env` (then re-ingest) |
| Use a different distance metric | `Distance.COSINE` in `ensure_collection()` |
| Swap Qdrant for another vector DB | replace this file and `step09_retrieve.py`; keep the `get_vector_store` / `retrieve` signatures |

## Example

```
[6] Qdrant     : collection 'pdf_rag' now holds 1306 vectors
```

On `python ingest.py --recreate` against a server:

```
    dropped old collection 'pdf_rag'
    created collection 'pdf_rag' (dim=384, cosine)
    stored 1306/1306 chunks
[6] Qdrant     : collection 'pdf_rag' now holds 1306 vectors
```
