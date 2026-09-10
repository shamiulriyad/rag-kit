# Embeddings — step 5

## What is an embedding?

A function that turns a piece of text into a fixed-length list of numbers (a
*vector*), such that texts with similar meaning land near each other in that
vector space. "notice period for quitting" and "how much warning before I resign"
produce nearby vectors even though they share almost no words.

## Why RAG needs it

Retrieval is "find the chunks most relevant to this question". With embeddings
that becomes a geometry problem: embed the question, find the nearest chunk
vectors (step 9). The **same model must embed both sides** — chunks at ingest
(step 6) and the question at query time (step 8) — or the vectors aren't
comparable.

## Where the code is

[`rag/rag/step05_embedding.py`](../rag/rag/step05_embedding.py)

- `get_embeddings()` — builds the client for `EMBEDDING_PROVIDER`, with clear
  errors for a bad provider / model / missing key / missing optional package.
- `detect_dimension()` — embeds one probe string and measures the result, so the
  vector size is **never hard-coded**.

Config lives in [`rag/config.py`](../rag/config.py) (`validate_embedding_config()`
does the early checks) and is set entirely through `rag/.env`.

## Which model is used

Set two lines in `.env`; nothing is hard-coded:

| Goal | `EMBEDDING_PROVIDER` | `EMBEDDING_MODEL` | Dim | Notes |
|------|---------------------|------------------|-----|-------|
| **Recommended default** | `google` | `gemini-embedding-001` | 3072 | Needs `GOOGLE_API_KEY`. Best for large PDFs on a CPU-only machine. |
| Local, fast, English | `huggingface` | `sentence-transformers/all-MiniLM-L6-v2` | 384 | No API key. CPU handles a few-hundred-page PDF in a minute or two. |
| Local, multilingual (incl. Bangla) | `huggingface` | `BAAI/bge-m3` | 1024 | No API key. Much heavier — minutes to tens of minutes on CPU. |

Other Gemini embedding models the kit accepts: `text-embedding-004`,
`embedding-001`. Any other value is rejected early with a one-line message.

### Why Gemini for a large PDF on a CPU-only machine

A local model embeds every chunk **on your CPU** — slow and memory-hungry for a
big document. The Gemini API does it remotely in batches, so ingestion stays fast
without a GPU. On the free tier it is rate-limited (~100 texts/minute), so
`step06_vector_store.py` sends in batches of `EMBED_BATCH_SIZE` (90) and sleeps
`EMBED_SLEEP` (60 s) between them.

## How to change the embedding model

1. Edit `rag/.env`:
   ```env
   EMBEDDING_PROVIDER=huggingface
   EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
   ```
2. For a local model, install the optional deps once:
   ```bash
   pip install -r requirements-local.txt      # pulls torch (~2 GB)
   ```
   (In Docker: uncomment the `requirements-local.txt` lines in
   [`rag/Dockerfile`](../rag/Dockerfile) and rebuild.)
3. **Re-ingest with `--recreate`:**
   ```bash
   python ingest.py --recreate
   ```

### Why `--recreate` is required

Two different models produce vectors that are **not comparable**, and almost
always a **different size** (384 vs 1024 vs 3072). The old collection is
unusable. The kit records the model that built the collection in
`rag/.rag_index_meta.json` (git-ignored) and, on the next run:

- `ask.py` / `POST /query` — **refuse to query** with a message telling you to
  re-ingest;
- `ingest.py` without `--recreate` — **refuse to append** (that would mix two
  models in one collection);
- Qdrant itself — rejects the insert on a dimension mismatch, caught in
  `step06_vector_store.py` with a readable error.

`EMBEDDING_DIM` in `.env` can force a size, but leaving it empty (auto-detect) is
recommended.

## Example

```
[5] Embedding  : gemini-embedding-001 (Gemini)
    vector size: 3072
```

vs. after switching to a local model and `python ingest.py --recreate`:

```
    wiped local storage for 'pdf_rag'
[5] Embedding  : sentence-transformers/all-MiniLM-L6-v2 (local)
    vector size: 384
    created collection 'pdf_rag' (dim=384, cosine)
```
