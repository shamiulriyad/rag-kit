"""STEP 1-11 over HTTP - the RAG service the .NET backend talks to.

    uvicorn main:app --port 8000          # run from this folder

`backend/Services/RagService.cs` calls three endpoints:

    GET  /health                          -> {"status": "ok", "ready": bool}
    POST /query   {question, top_k?}      -> {"answer": str,
                                              "sources": [{page, source, score}]}
    POST /ingest  (multipart: file=PDF)   -> {"document": str, "pages": int,
                                              "chunks": int, "recreated": bool}

`/query` and `/ingest` reuse the exact same step modules as `ask.py` and
`ingest.py` - this file only exposes them over HTTP, it holds no RAG logic.

`/query` works with Qdrant in either mode (embedded on-disk or a server).
`/ingest` needs **Qdrant server mode** (`QDRANT_URL`, no `QDRANT_PATH`): embedded
on-disk Qdrant allows only one open handle, so a long-running service cannot also
write to it - in that mode `/ingest` returns 501 and you ingest with the
`python ingest.py` CLI instead. `docker compose up` (Part 3) runs the server.
"""

import re
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel

import config
from rag import index_meta
from rag.step01_load_pdf import load_pdf
from rag.step02_extract_text import extract_text
from rag.step03_clean_text import clean_documents
from rag.step04_chunking import chunk_documents
from rag.step05_embedding import get_embeddings
from rag.step06_vector_store import get_vector_store, store_chunks
from rag.step08_query_embedding import embed_question
from rag.step09_retrieve import retrieve
from rag.step10_generate import generate_answer, get_llm

# The embedding model, Qdrant vector store and LLM are built once and reused for
# every request. Kept in a dict so the lifespan handler and the lazy fallback
# share it.
_state: dict = {}


def _ensure_ready() -> None:
    """Load models / open Qdrant on first use. Safe to call repeatedly."""
    if _state.get("ready"):
        return
    index_meta.check_before_query()                     # model still matches the index?
    embeddings = get_embeddings()                       # step 5 (read side)
    _state["embeddings"] = embeddings
    _state["vector_store"] = get_vector_store(embeddings)  # step 6 (read side)
    _state["llm"] = get_llm()                           # step 10
    _state["ready"] = True


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Warm up at startup so the first real request is fast. If it fails (e.g. the
    # collection has not been ingested yet) the service still starts and /health
    # stays green; /query then returns a clear 503.
    try:
        _ensure_ready()
    except Exception as exc:  # noqa: BLE001 - reported back on /query
        print(f"[startup] not ready yet: {exc}")
    yield
    _state.clear()


app = FastAPI(title="PDF RAG service", lifespan=lifespan)


class QueryIn(BaseModel):
    question: str
    top_k: Optional[int] = None


class SourceOut(BaseModel):
    page: Optional[int] = None
    source: str
    score: float


class AnswerOut(BaseModel):
    answer: str
    sources: List[SourceOut]


class IngestOut(BaseModel):
    document: str
    pages: int
    chunks: int
    recreated: bool


# Gemini tags claims with [S1], [S2]... (sometimes back-to-back) - strip them.
_MARKER_RE = re.compile(r"[ \t]*(?:\[S\d+\])+")


def strip_markers(text: str) -> str:
    return _MARKER_RE.sub("", text).strip()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "ready": bool(_state.get("ready"))}


@app.post("/query", response_model=AnswerOut)
def query(body: QueryIn) -> AnswerOut:
    question = body.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="question is required")

    try:
        _ensure_ready()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=503,
            detail=f"RAG service not ready: {exc}. Ingest a PDF first "
                   "(POST /ingest, or run `python ingest.py`).",
        ) from exc

    k = body.top_k or config.TOP_K
    query_vector = embed_question(_state["embeddings"], question)         # 8
    scored_docs = retrieve(_state["vector_store"], query_vector, k)       # 9
    answer = generate_answer(question, scored_docs, llm=_state["llm"])    # 10
    answer = strip_markers(answer)

    sources = [                                                          # 11
        SourceOut(
            page=doc.metadata.get("page_number"),
            source=doc.metadata.get("source_file", "document"),
            score=float(score),
        )
        for doc, score in scored_docs
    ]
    return AnswerOut(answer=answer, sources=sources)


@app.post("/ingest", response_model=IngestOut)
def ingest(file: UploadFile = File(...), recreate: bool = True) -> IngestOut:
    """Steps 1-6 over HTTP: save the uploaded PDF, then (re)build the collection.

    Needs Qdrant in **server mode** (`QDRANT_URL`, no `QDRANT_PATH`). Embedded
    on-disk Qdrant allows only one open handle, so this long-running service
    cannot also write to it - use the `python ingest.py` CLI in that case.

    `recreate` defaults to True - this kit indexes one document at a time, so a
    new upload replaces the old vectors instead of appending duplicates.
    """
    if config.QDRANT_PATH:
        raise HTTPException(
            status_code=501,
            detail=(
                "Upload-to-ingest needs Qdrant server mode. Either clear "
                "QDRANT_PATH and set QDRANT_URL in .env (see `docker compose up`), "
                "or ingest from the CLI: `python ingest.py --pdf <file> --recreate`."
            ),
        )
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="upload a .pdf file")

    data_dir = Path(config.PDF_PATH).parent
    data_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(file.filename).name                 # strip any client path
    pdf_path = data_dir / safe_name
    pdf_path.write_bytes(file.file.read())

    try:
        pages = clean_documents(extract_text(load_pdf(pdf_path)))               # 1-3
        chunks = chunk_documents(pages, config.CHUNK_SIZE, config.CHUNK_OVERLAP)  # 4
        embeddings = _state.get("embeddings") or get_embeddings()              # 5
        _state["embeddings"] = embeddings
        store_chunks(chunks, embeddings, recreate=recreate)                    # 6
        if _state.get("ready"):
            _state["vector_store"] = get_vector_store(embeddings)  # point /query at the rebuilt collection
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"ingestion failed: {exc}") from exc

    return IngestOut(
        document=safe_name, pages=len(pages), chunks=len(chunks), recreated=recreate
    )
