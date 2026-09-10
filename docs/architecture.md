# Architecture

## What

Three processes, one direction of calls:

```
 React (frontend/)           browser UI: upload a PDF, ask, read answer + sources
      │  HTTP / REST
      ▼
 ASP.NET Core (backend/)     API layer: routing, validation, error handling,
      │  HTTP                service-to-service calls. No RAG logic.
      ▼
 Python RAG (rag/)           all the RAG work: extract, chunk, embed, retrieve, generate
      │
      ├── Qdrant             vector database
      └── Gemini             embeddings (default) + the LLM
```

## Why this split

- **React never calls Python.** The browser only knows the .NET backend. That
  keeps one public API surface, one place for CORS, auth, rate-limiting and
  validation later, and lets the Python service stay private.
- **.NET holds no RAG logic.** Chunking, embedding, Qdrant and Gemini all live in
  Python. The backend forwards requests and reshapes responses — nothing else. If
  you find yourself adding a text splitter in C#, it belongs in `rag/`.
- **Python is a plain HTTP service.** The same step modules run from the CLI
  (`ingest.py`, `ask.py`) and over HTTP (`main.py`). The transport is not where
  the logic lives.

## Where the code is

| Layer | Entry point | Key files |
|-------|-------------|-----------|
| React | [`frontend/src/main.tsx`](../frontend/src/main.tsx) → `App` → `pages/Home.tsx` | `components/`, `services/api.ts` |
| .NET | [`backend/Program.cs`](../backend/Program.cs) | `Controllers/`, `Services/RagService.cs`, `Models/` |
| Python | [`rag/main.py`](../rag/main.py) (HTTP) · `ingest.py` / `ask.py` (CLI) | `rag/config.py`, `rag/rag/step01…step11` |

## The API contract

| React → .NET | .NET → Python | Purpose |
|--------------|---------------|---------|
| `GET /api/health` | `GET /health` | Is everything reachable? |
| `POST /api/chat` `{question, topK?}` | `POST /query` `{question, top_k?}` | Ask a question |
| `POST /api/documents/upload` (multipart `file`) | `POST /ingest` (multipart `file`) | Index a PDF |

Response shape returned to React:

```json
{
  "answer": "Generated answer grounded in the PDF...",
  "sources": [
    { "page": 3, "document": "example.pdf", "score": 0.82 }
  ]
}
```

The wire format between .NET and Python (`snake_case`, `source` vs `document`)
is translated in one place: [`backend/Services/RagService.cs`](../backend/Services/RagService.cs).
Controllers and React only ever see the clean models.

## How to change it

- **Swap the LLM or vector DB:** only `rag/` changes. `.NET` and React don't know
  which model or database is behind the Python service.
- **Add an endpoint:** add it to `rag/main.py`, then a controller + a method on
  `IRagService` in `backend/`, then a function in `frontend/src/services/api.ts`.
- **Point the backend at a remote Python service:** set `Rag__BaseUrl`. Nothing
  else moves.
- **Add auth:** it goes in the .NET layer, in front of the controllers — Python
  stays on a private network.

## Example: one question, end to end

1. `Home.tsx` calls `askQuestion("...")` → `POST http://localhost:5038/api/chat`.
2. `ChatController` validates, calls `IRagService.AskAsync`.
3. `RagService` sends `POST http://localhost:8000/query` `{question, top_k}`.
4. `main.py` runs steps 8→9→10→11 (embed question, search Qdrant, call Gemini,
   collect sources).
5. Python returns `{answer, sources:[{page,source,score}]}`.
6. `RagService` maps it to `ChatResponse { Answer, Sources:[{Page,Document,Score}] }`.
7. React renders the answer and the source list.

See [rag-pipeline.md](rag-pipeline.md) for what happens inside step 4.
