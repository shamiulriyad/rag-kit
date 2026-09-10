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
| `get_client()` | open Qdrant — embedded (path) or server (url) |
| `detect_or_config_dim()` | vector size from step 5 (detected, not hard-coded) |
| `ensure_collection()` | create the collection at the right size, or detect a dimension mismatch |
| `_reset_local_storage()` | on `--recreate` in embedded mode, delete the on-disk folder first |
| `store_chunks()` | embed chunks in batches and upsert them; record the index metadata |
| `get_vector_store()` | the read-side handle used by step 9 |

## Two ways to run Qdrant

| Mode | Set in `.env` | Concurrency | Upload-to-index (`POST /ingest`) |
|------|---------------|-------------|-----------------------------------|
| **Embedded on-disk** (default by hand) | `QDRANT_PATH=qdrant_data` | one process at a time | ✗ — use `python ingest.py` |
| **Server** (default in Docker) | `QDRANT_URL=...`, `QDRANT_PATH` empty | many clients | ✓ |

`QDRANT_PATH` wins: if it is set, `QDRANT_URL` is ignored.

**Why the long-running service can't ingest in embedded mode:** embedded Qdrant
allows only one open handle to the on-disk store. While `uvicorn main:app` holds
it for `/query`, it cannot also open it for writing, so `POST /ingest` returns
`501` and points you at the CLI. `docker compose up` runs a real server, so
uploads work there.

Run a server by hand:

```bash
docker run -p 6333:6333 -v qdrant_storage:/qdrant/storage qdrant/qdrant
```

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

## The `--recreate` gotcha in embedded mode

In embedded mode, `delete_collection()` clears the registry entry but **leaves
`qdrant_data/collection/<name>/storage.sqlite` on disk**, and the next
`create_collection()` re-attaches to that stale file — so a re-ingest *appends*
(1306 → 2612 → 3918 chunks) and a dimension change breaks inserts. So
`store_chunks()` calls `_reset_local_storage()` **before opening any client** on
`--recreate`, physically removing the folder. Server mode doesn't have this
problem. Always pass `--recreate` when you change the model or the PDF.

## How to change it

| Want to… | Do |
|----------|-----|
| Use Qdrant Cloud | set `QDRANT_URL` to the cluster URL + `QDRANT_API_KEY`, clear `QDRANT_PATH` |
| Rename the collection | `COLLECTION_NAME` in `.env` (then re-ingest) |
| Use a different distance metric | `Distance.COSINE` in `ensure_collection()` |
| Swap Qdrant for another vector DB | replace this file and `step09_retrieve.py`; keep the `get_vector_store` / `retrieve` signatures |

## Example

```
[6] Qdrant     : collection 'pdf_rag' now holds 168 vectors
```

On `python ingest.py --recreate`:

```
    wiped local storage for 'pdf_rag'
    created collection 'pdf_rag' (dim=3072, cosine)
    stored 168/168 chunks
[6] Qdrant     : collection 'pdf_rag' now holds 168 vectors
```
