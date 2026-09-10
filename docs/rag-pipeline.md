# The RAG pipeline

## What

RAG = **Retrieval-Augmented Generation**. Instead of asking the LLM to answer
from memory, you first *retrieve* the passages of your document that are relevant
to the question, then ask the LLM to answer *using only those passages*. The
answer is grounded in your PDF, and every claim can be traced to a page.

## Why 11 separate modules

Each stage is one file with one job, in [`rag/rag/`](../rag/rag/). You can open
`step04_chunking.py` and understand chunking without reading anything else, and
you can replace a stage (a different splitter, a different vector DB) without
touching the others. The bad alternative is one `rag.py` that does everything.

## The steps

```
INGEST  (rag/ingest.py — run once per PDF)
  1  load_pdf            step01_load_pdf.py         validate the file
  2  extract_text        step02_extract_text.py     PyMuPDF → one Document per page
                         pdf_font_repair.py         undo broken subset-font encodings
  3  clean_documents     step03_clean_text.py       de-hyphenate, unwrap lines, drop headers
  4  chunk_documents     step04_chunking.py         split into overlapping chunks + metadata
  5  get_embeddings      step05_embedding.py        pick the embedding model
  6  store_chunks        step06_vector_store.py     embed every chunk, upsert into Qdrant

ASK  (rag/ask.py or POST /query — run per question)
  7  get_question        step07_user_question.py    read the question
  8  embed_question      step08_query_embedding.py  question → vector (same model as step 5)
  9  retrieve            step09_retrieve.py         cosine search in Qdrant → top-K chunks
  10 generate_answer     step10_generate.py         chunks + question → Gemini, grounded prompt
  11 present / sources   step11_answer.py           answer + [S1..Sn] page citations
```

## Where each entry point lives

| Entry point | Runs steps | Use it for |
|-------------|-----------|------------|
| [`rag/ingest.py`](../rag/ingest.py) | 1–6 | Indexing a PDF from the CLI |
| [`rag/ask.py`](../rag/ask.py) | 7–11 | Asking from the CLI (one-shot or interactive) |
| [`rag/main.py`](../rag/main.py) | 1–6 on `POST /ingest`, 7–11 on `POST /query` | The HTTP service the .NET backend calls |

`main.py` imports the *exact same* step functions as the CLIs — it holds no RAG
logic of its own, it just exposes them over HTTP.

## How to change the pipeline

| Want to… | Change |
|----------|--------|
| Use a different splitter | `step04_chunking.py` |
| Add OCR for scanned PDFs | between steps 2 and 3 (see [ingestion.md](ingestion.md)) |
| Swap the embedding model | `.env` only — `EMBEDDING_PROVIDER` / `EMBEDDING_MODEL`, then re-ingest `--recreate` |
| Swap Qdrant for another vector DB | `step06_vector_store.py` + `step09_retrieve.py` |
| Change the answer prompt / grounding rules | `SYSTEM_PROMPT` in `step10_generate.py` |
| Retrieve more/less context | `TOP_K` in `.env` |

## Example: index then ask

```bash
cd rag
python ingest.py --pdf data/handbook.pdf --recreate
#  [1] PDF        : handbook.pdf (812.4 KB)
#  [2] Extracted  : 44 pages, 98,220 characters
#  [3] Cleaned    : 43 pages kept, 1 dropped, 2 repeating header/footer lines removed
#  [4] Chunked    : 168 chunks (size=1000, overlap=150, avg=812 chars)
#  [5] Embedding  : gemini-embedding-001 (Gemini)
#      vector size: 3072
#  [6] Qdrant     : collection 'pdf_rag' now holds 168 vectors

python ask.py "what is the notice period for resignation?"
#  [8] Query vec  : 3072 dimensions
#  [9] Retrieved  : 4 chunks
#  [10] Gemini    : gemini-2.5-flash answered
#  ====================================================================
#  Q: what is the notice period for resignation?
#  --------------------------------------------------------------------
#  Employees must give 30 days' written notice [S1]. ...
#  --------------------------------------------------------------------
#  Sources:
#    [S1] handbook.pdf, page 12  (score 0.84)
```
