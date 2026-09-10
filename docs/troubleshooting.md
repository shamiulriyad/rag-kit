# Troubleshooting

Organised by **where** it breaks. The pipeline prints `[1]`…`[11]` as it runs, so
the last number you saw tells you which section to read.

---

## Setup

| Symptom | Cause | Fix |
|---------|-------|-----|
| `torch` / `sentence-transformers` won't install | Python 3.13+ (system Python here is 3.14) | Make the venv with **3.11**: `python3.11 -m venv venv`. The default Gemini path doesn't need torch at all. |
| `ModuleNotFoundError: langchain_huggingface` | local-embedding deps not installed | `pip install -r requirements-local.txt`, or switch to `EMBEDDING_PROVIDER=google` |
| `GOOGLE_API_KEY is not set` | no `.env`, or key not filled in | `cp .env.example .env` and paste the key from <https://aistudio.google.com/app/apikey> |
| `dotnet run` fails: SDK not found | .NET 10 SDK missing | install the .NET 10 SDK |

---

## Step 1–2 — PDF / extraction

| Symptom | Cause | Fix |
|---------|-------|-----|
| `FileNotFoundError: PDF not found` | wrong `--pdf` path / `PDF_PATH` | paths are relative to `rag/`; check the file is in `rag/data/` |
| `! Almost no text found - probably a scan` | image-only PDF, no text layer | add OCR (`ocrmypdf in.pdf out.pdf`) before ingesting |
| `! N page(s) still look corrupted after font repair` | subset font with no ToUnicode map that the repair maps don't cover | those maps are PDF-specific; OCR is the fallback |
| Extracted text has weird spacing | normal PDF quirk | step 3 cleans most of it; tune the regexes in `step03_clean_text.py` if needed |

---

## Step 3–4 — cleaning / chunking

| Symptom | Cause | Fix |
|---------|-------|-----|
| Real content disappeared after cleaning | a content line repeated on >60 % of pages got treated as a header | raise `threshold` in `_find_repeating_lines` (`step03_clean_text.py`) |
| Answers miss context that's clearly in the PDF | chunks too large, relevant passage diluted | lower `CHUNK_SIZE` to 400–600, re-ingest `--recreate` |
| Too many near-duplicate chunks | re-ran `ingest.py` **without** `--recreate` in embedded mode | always pass `--recreate`; it wipes `qdrant_data/collection/<name>` first |

---

## Step 5 — embeddings

| Symptom | Cause | Fix |
|---------|-------|-----|
| `EMBEDDING_PROVIDER='...' is not valid` | typo; must be `google` or `huggingface` | fix `.env` |
| `EMBEDDING_MODEL='...' is not a known Gemini embedding model` | unsupported model name | use `gemini-embedding-001` (recommended), `text-embedding-004`, or `embedding-001` |
| `429` / `Resource exhausted` during ingest | Gemini free-tier rate limit (~100 texts/min) | it already sleeps `EMBED_SLEEP=60` between batches; lower `EMBED_BATCH_SIZE`, or wait and re-run with `--recreate` |
| Ingest of a big PDF takes forever on CPU | local model embedding every chunk on CPU | use `EMBEDDING_PROVIDER=google`, a smaller local model, or a GPU |
| `The embedding model could not be reached` | bad/no API key (Gemini) or no internet on first local-model download | check `GOOGLE_API_KEY` / connectivity |

---

## Step 6 — Qdrant

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Qdrant dimension mismatch: collection stores X-dim … model produces Y-dim` | changed the embedding model without rebuilding | `python ingest.py --recreate` |
| `Embedding model changed - the 'pdf_rag' collection was built with A, but .env now says B` | `.rag_index_meta.json` guard | `python ingest.py --recreate` |
| `POST /ingest` returns `501` | Qdrant is embedded on-disk; a running service can't also write to it | run `python ingest.py`, or use server mode (`docker compose up`) |
| `[Errno 11] Resource temporarily unavailable` opening Qdrant | another process holds the embedded store (another `uvicorn`, `ask.py`, a stale lock) | stop the other process; delete `qdrant_data/.lock` if stale |
| Re-ingest keeps *adding* vectors (count grows each run) | embedded `delete_collection()` leaves `storage.sqlite` behind | use `--recreate` — `_reset_local_storage()` removes the folder first |

---

## Step 8–11 — query / generation

| Symptom | Cause | Fix |
|---------|-------|-----|
| `503 RAG service not ready … Ingest a PDF first` | collection empty / not built | `python ingest.py --pdf data/your.pdf --recreate` |
| Answer is "the document does not cover it" but it does | retrieval missed the passage | raise `TOP_K`; lower `CHUNK_SIZE` and re-ingest; check the page isn't `corrupted` in step 2 |
| Answer includes facts not in the PDF | model ignored the grounding rules | lower `TEMPERATURE`; tighten `SYSTEM_PROMPT` in `step10_generate.py` |
| Sentences have no `[S1]` markers | weak grounding | treat as unverified; check against the printed sources |
| Wrong language in the answer | — | the prompt already says "answer in the question's language"; rephrase, or add an explicit instruction |

---

## .NET backend

| Symptom | Cause | Fix |
|---------|-------|-----|
| `502 Cannot reach the Python RAG service` | `uvicorn` not running, or wrong `Rag:BaseUrl` | start it (`cd rag && uvicorn main:app --port 8000`); check the URL |
| `504 … timed out during 'ingest'` | large PDF, slow embedding | raise `Rag:TimeoutSeconds`; or pre-index with `python ingest.py` |
| `GET /api/health` shows `"rag":"unreachable"` | backend is up, Python is not | same as the 502 row |

---

## React frontend

| Symptom | Cause | Fix |
|---------|-------|-----|
| Page says "backend unreachable" | .NET not running, or wrong `VITE_API_URL` | `cd backend && dotnet run`; check `frontend/.env` |
| CORS error in the browser console | frontend origin not in `Cors:Origins` | add it (`Cors__Origins__1=...`) and restart the backend |
| Changed `VITE_API_URL` but nothing happened | Vite inlines env at build time | restart `npm run dev`; for Docker, rebuild the `frontend` image |
| Upload button errors with `501` | embedded Qdrant (see step 6) | index with `python ingest.py`, or run `docker compose up` |

---

## Docker

| Symptom | Cause | Fix |
|---------|-------|-----|
| `env file .env not found` | no root `.env` | `cp .env.example .env` |
| `frontend` can't reach `backend` | `VITE_API_URL` set to `http://backend:8000` (a compose name the browser can't resolve) | it must be `http://localhost:5038` (host-published port) — the default build arg |
| `rag` container: `ModuleNotFoundError` for a local embedding model | image built without `requirements-local.txt` | uncomment those lines in `rag/Dockerfile`, `docker compose build rag` |
| Vectors lost after `docker compose down` | using `down -v`, which removes the `qdrant_storage` volume | use plain `docker compose down`; re-ingest if the volume was cleared |
