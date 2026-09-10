# Ingestion — steps 1 to 4

Turning a PDF into clean, retrievable chunks, each carrying enough metadata to
cite. Steps 5–6 (embed + store) are in [embeddings.md](embeddings.md) and
[qdrant.md](qdrant.md).

---

## Step 1 — Load the PDF

**What:** validate the path before the pipeline starts.
**Why:** a wrong filename should fail on line one, not after two minutes of
embedding.
**Where:** [`rag/rag/step01_load_pdf.py`](../rag/rag/step01_load_pdf.py)
**How:** checks the file exists, ends in `.pdf`, and is non-empty; returns a
resolved `Path`.

---

## Step 2 — Extract text

**What:** one LangChain `Document` per page, with the **1-based page number** in
`metadata["page_number"]` — that number is what step 11 cites.
**Why:** embeddings and retrieval work on text; the page number is what makes a
source useful.
**Where:** [`rag/rag/step02_extract_text.py`](../rag/rag/step02_extract_text.py)
(+ [`rag/rag/pdf_font_repair.py`](../rag/rag/pdf_font_repair.py))
**How:**

- PyMuPDF reads each page.
- `repair_page` undoes broken **subset-font encodings**. Some PDFs embed fonts
  with no `ToUnicode` map, so every extractor returns scrambled glyphs
  (`& ? ! & &`). For a normal PDF this is a pass-through and changes nothing.
- Every page is then scored (alphabetic ratio + English-word ratio) as
  `readable` / `corrupted` / `blank`. Corrupted pages are **reported, not
  silently embedded**.

**Scanned PDFs won't work** — there is no text layer to extract. Step 2 prints a
warning when a page yields almost nothing. Add OCR (`pytesseract` / `ocrmypdf`)
**between step 2 and step 3** in that case.

**How to change:** swap the extractor here (e.g. `pypdf`, `pdfplumber`); keep the
`page_number` metadata contract so citations keep working.

---

## Step 3 — Clean the text

**What:** remove everything that pollutes an embedding but carries no meaning.
**Why:** hard line breaks, hyphen-split words and repeated headers/footers make
two unrelated chunks look similar and waste the chunk budget.
**Where:** [`rag/rag/step03_clean_text.py`](../rag/rag/step03_clean_text.py)
**How:**

- join hyphen-split words: `informa-\ntion` → `information`
- unwrap mid-sentence line breaks, collapse runs of spaces and blank lines
- strip standalone page-number lines
- detect lines that appear on **> 60 %** of pages (running headers / footers) and
  delete them
- drop pages with < 50 characters left

**How to change:** the regexes and the `threshold` / `min_chars` arguments are
all at the top of the file.

---

## Step 4 — Chunk + metadata

**What:** split each cleaned page into overlapping chunks.
**Why:** an embedding model has a fixed context window, and retrieval is only
useful if a "hit" is a focused passage, not a whole page. Overlap keeps a
sentence that straddles a boundary findable from either side.
**Where:** [`rag/rag/step04_chunking.py`](../rag/rag/step04_chunking.py)
**How:** LangChain's `RecursiveCharacterTextSplitter`, splitting on paragraph →
line → sentence (incl. the Bengali danda `।`) → word. `CHUNK_SIZE` (default 1000)
and `CHUNK_OVERLAP` (default 150) come from `.env`.

### Metadata on every chunk (this is what makes citations work)

| Key | Set in | Used by |
|-----|--------|---------|
| `source_file` | step 2 | step 10/11 — the document name |
| `page_number` | step 2 | step 9/10/11 — the page cited |
| `page` (0-based) | step 2 | internal |
| `chunk_id` | step 4 | identifying a specific chunk |
| `start_index` | step 4 (`add_start_index`) | offset of the chunk within its page |

All of it is stored alongside the vector in Qdrant (step 6) and travels back with
each retrieved chunk (step 9).

**How to change retrieval quality here:** `CHUNK_SIZE` 800–1200 suits prose; drop
to 400–600 for dense tables and specs. Re-ingest with `--recreate` after changing
either value.

---

## Example

```
[1] PDF        : handbook.pdf (812.4 KB)
[2] Extracted  : 44 pages, 98,220 characters
    quality    : 43 readable, 0 corrupted, 1 blank
[3] Cleaned    : 43 pages kept, 1 dropped, 2 repeating header/footer lines removed
[4] Chunked    : 168 chunks (size=1000, overlap=150, avg=812 chars)
```
