# Retrieval & generation — steps 7 to 11

The query side. Runs from `python ask.py "..."` or `POST /query`, both calling
the same functions.

---

## Step 7 — Get the question

**Where:** [`rag/rag/step07_user_question.py`](../rag/rag/step07_user_question.py)
**What:** read the question from CLI args or an interactive prompt; reject empty
input. Over HTTP this is just the `question` field of the request body.

---

## Step 8 — Embed the question

**What / Why:** turn the question into a vector with **the same model used in
step 5**. Different model → incomparable vectors → nonsense results.
**Where:** [`rag/rag/step08_query_embedding.py`](../rag/rag/step08_query_embedding.py)
— `embed_question(embeddings, question)` → `list[float]`.
Doing this explicitly (rather than letting a LangChain retriever hide it) keeps
the vector inspectable and cacheable.

---

## Step 9 — Retrieve

**What:** cosine nearest-neighbour search in Qdrant for the top `K` chunks.
**Why:** these chunks — and only these — become the context the LLM may use.
**Where:** [`rag/rag/step09_retrieve.py`](../rag/rag/step09_retrieve.py) —
`retrieve(vector_store, query_vector, k)` → `list[(Document, score)]`, highest
score first. Each `Document` still carries the `source_file` / `page_number` /
`chunk_id` metadata from ingestion.
**Tune it:** `TOP_K` in `.env` (default 4). Raise it if answers miss context,
lower it if Gemini drifts off-topic. `top_k` in the request body overrides it
per call.

---

## Step 10 — Generate with Gemini

**What:** build the context block from the retrieved chunks, then ask Gemini to
answer **from that context only**.
**Where:** [`rag/rag/step10_generate.py`](../rag/rag/step10_generate.py)

- `get_llm()` → `ChatGoogleGenerativeAI(model=LLM_MODEL, temperature=TEMPERATURE)`
- `format_context()` labels each chunk `[S1] (file, page N)` … `[Sn]`
- `SYSTEM_PROMPT` enforces the grounding rules:
  - use only the context, no outside knowledge
  - tag every claim with the `[S1]`…`[Sn]` marker of its source chunk
  - if the context doesn't cover it, say so — don't guess
  - answer in the question's language

**Change the behaviour:** edit `SYSTEM_PROMPT`; change `LLM_MODEL` /
`TEMPERATURE` in `.env`.

---

## Step 11 — Answer + sources

**Where:** [`rag/rag/step11_answer.py`](../rag/rag/step11_answer.py)
**What:** pair the answer with a source list built from the retrieved chunks —
`marker`, `page`, `file`, `score`, and the chunk `text`. The CLI prints it; the
HTTP layer returns it as JSON.

**Grounding check:** an answer sentence with no `[S1]`-style marker is a red flag
— it may not be supported by the document. Over HTTP the markers are stripped
from the prose before returning (`strip_markers` in `main.py`) and the structured
`sources` array is sent instead.

---

## Over HTTP: `POST /query`

[`rag/main.py`](../rag/main.py)

```jsonc
// request
{ "question": "what is the notice period?", "top_k": 4 }   // top_k optional

// response
{
  "answer": "Employees must give 30 days' written notice. ...",
  "sources": [
    { "page": 12, "source": "handbook.pdf", "score": 0.84 },
    { "page": 13, "source": "handbook.pdf", "score": 0.71 }
  ]
}
```

- Models load once (lifespan warm-up) and are reused; first call after startup is
  lazy if warm-up failed.
- Not ingested yet → `503` with a message telling you to ingest first.
- The `.NET` backend maps `source` → `document` and returns the same shape to
  React. See [backend-connection.md](backend-connection.md).

---

## Example

```
[7] Question   : what is the notice period for resignation?
[8] Query vec  : 3072 dimensions
[9] Retrieved  : 4 chunks
    S1 page 12 | score 0.842 | Resignation. An employee wishing to resign must ...
    S2 page 13 | score 0.717 | ... notice may be waived at the company's discretion ...
[10] Gemini    : gemini-2.5-flash answered
========================================================================
Q: what is the notice period for resignation?
------------------------------------------------------------------------
Employees must give 30 days' written notice of resignation [S1]. The company
may waive part of this period at its discretion [S2].
------------------------------------------------------------------------
Sources:
  [S1] handbook.pdf, page 12  (score 0.842)
  [S2] handbook.pdf, page 13  (score 0.717)
========================================================================
```
