# Backend connection — ASP.NET Core

## What

A thin HTTP API in front of the Python RAG service. It is the **only** thing the
React app talks to.

## Why it exists (and stays thin)

- One public surface for the browser: CORS, validation, error shaping, and later
  auth / rate-limiting, all in one place.
- The Python service can stay on a private network.
- **No RAG logic here.** No chunking, embedding, Qdrant or Gemini code. If a
  change needs any of those, it goes in [`rag/`](../rag/).

## Where the code is — [`backend/`](../backend/)

| File | Role |
|------|------|
| [`Program.cs`](../backend/Program.cs) | DI wiring: typed `HttpClient`, CORS, the error-to-JSON middleware |
| [`Configuration/RagSettings.cs`](../backend/Configuration/RagSettings.cs) | bound from `appsettings.json` → `Rag:BaseUrl`, `Rag:TimeoutSeconds` |
| [`Controllers/HealthController.cs`](../backend/Controllers/HealthController.cs) | `GET /api/health` |
| [`Controllers/ChatController.cs`](../backend/Controllers/ChatController.cs) | `POST /api/chat` |
| [`Controllers/DocumentController.cs`](../backend/Controllers/DocumentController.cs) | `POST /api/documents/upload` |
| [`Services/RagService.cs`](../backend/Services/RagService.cs) | the one place that knows the Python wire format |
| [`Models/`](../backend/Models/) | `ChatRequest`, `ChatResponse`, `Source`, `DocumentResponse` — what React sees |

## Endpoints

| Method + path | Body | Calls Python | Returns |
|---------------|------|--------------|---------|
| `GET /api/health` | – | `GET /health` | `{ status: "ok", rag: "ok" \| "unreachable" }` |
| `POST /api/chat` | `{ question, topK? }` | `POST /query` `{ question, top_k? }` | `{ answer, sources: [{ page, document, score }] }` |
| `POST /api/documents/upload` | multipart `file=<pdf>` | `POST /ingest` multipart `file` | `{ document, pages, chunks, recreated }` |

## How the translation works

`RagService` owns the mapping so controllers and React never see Python's shape:

| Python (snake_case) | .NET / React model |
|---------------------|--------------------|
| `sources[].source` | `Sources[].Document` |
| `sources[].page` | `Sources[].Page` |
| `top_k` | `TopK` |
| FastAPI `{ "detail": "..." }` on error | unwrapped into `RagException.Message` → `{ "error": "..." }` |

## Error handling

`RagService` turns failures into a `RagException` with a real HTTP status, and
the middleware in `Program.cs` renders it as `{ "error": "..." }`:

| Situation | Status React gets | Message |
|-----------|-------------------|---------|
| Python unreachable | `502` | "Cannot reach the Python RAG service. Is it running?" |
| Python slow (big PDF) | `504` | "The RAG service timed out during 'ingest'…" |
| Python returned 4xx/5xx | that status | the FastAPI `detail` string |
| Empty body from Python | `502` | "Empty response from the RAG service." |

`Rag:TimeoutSeconds` defaults to **600** because embedding a large PDF on the
free Gemini tier is genuinely slow.

## Upload caveat

`POST /api/documents/upload` only works when the Python service has Qdrant in
**server mode** (Docker does this). With embedded on-disk Qdrant, Python returns
`501` and you index with `python ingest.py`. See [qdrant.md](qdrant.md).

## How to change it

| Want to… | Do |
|----------|-----|
| Point at a remote Python service | set `Rag__BaseUrl` (env) or `Rag:BaseUrl` (appsettings) |
| Allow another frontend origin | add to `Cors:Origins` / `Cors__Origins__1` |
| Add an endpoint | add to `rag/main.py` → add a method to `IRagService` → add a controller action |
| Raise the upload size limit | `MaxBytes` in `DocumentController.cs` |

## Example

```bash
curl -s http://localhost:5038/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"question":"what is the notice period?","topK":4}'
# {"answer":"Employees must give 30 days' written notice. ...",
#  "sources":[{"page":12,"document":"handbook.pdf","score":0.84}]}
```
