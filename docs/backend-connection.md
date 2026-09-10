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
| `POST /api/documents/upload` | multipart `file=<pdf>` | `POST /ingest?filename=…` (raw PDF body, streamed) | `{ document, pages, chunks, recreated }` |

## How the translation works

`RagService` owns the mapping so controllers and React never see Python's shape:

| Python (snake_case) | .NET / React model |
|---------------------|--------------------|
| `sources[].source` | `Sources[].Document` |
| `sources[].page` | `Sources[].Page` |
| `top_k` | `TopK` |
| FastAPI `{ "detail": "..." }` on error | its status + text passed straight through → `{ "success": false, "message": "..." }` |

The browser → .NET hop is multipart (`IFormFile`, buffered to disk above ~64 KB).
The .NET → Python hop is a **raw `application/pdf` body**, streamed — so no
multipart part-size limit applies on the Python side and nothing holds the whole
PDF in memory.

## Error handling

Every failure leaves the API as JSON `{ "success": false, "message": "..." }`
with a real status — never a dropped connection (which the browser can only show
as "Failed to fetch"). The middleware in `Program.cs` handles `RagException`,
`BadHttpRequestException` (body over the limit), and any unhandled exception.

| Situation | Status React gets | Message |
|-----------|-------------------|---------|
| Upload over the size limit | `413` | "PDF exceeds the configured upload limit of 200 MB." |
| Scanned / image-only PDF | `422` | "This PDF appears to be scanned/image-based. OCR is required before indexing." |
| Qdrant in embedded mode | `501` | "Upload needs Qdrant in server mode. …" |
| Python unreachable | `502` | "Cannot reach the Python RAG service. Is it running?" |
| Python slow (big PDF) | `504` | "The RAG service timed out during 'ingest'…" |
| Other Python 4xx/5xx | that status | the FastAPI `detail` string, passed through |
| Backend bug | `500` | "Unexpected error in the backend. Check its logs." |

`Rag:TimeoutSeconds` defaults to **600** because embedding a large PDF on the
free Gemini tier is genuinely slow.

## Upload size limit

Configurable, not unlimited: `Upload:MaxBytes` in `appsettings.json` (or
`Upload__MaxBytes`), default **200 MB**. It is applied to Kestrel's
`MaxRequestBodySize` and `FormOptions.MultipartBodyLengthLimit` in `Program.cs`,
and mirrored on the Python side by `MAX_UPLOAD_MB` and in the browser by
`VITE_MAX_UPLOAD_MB`. Raise all three together for very large PDFs.

## Upload needs Qdrant in server mode

`POST /api/documents/upload` works when the Python service runs Qdrant as a
**server** (the normal mode; `docker compose up` sets it up). With the embedded
on-disk fallback, Python returns `501` and you index with `python ingest.py`.
See [qdrant.md](qdrant.md).

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
