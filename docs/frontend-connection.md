# Frontend connection — React

## What

A deliberately small React + TypeScript + Vite app: upload a PDF, ask questions,
read the answer and its sources. This is a RAG resource, not a UI showcase.

## Why it's this thin

Everything interesting happens server-side. The frontend's only jobs are to
collect input, call the **.NET backend** (never Python directly), and render what
comes back — including the source list, so answers are traceable.

## Where the code is — [`frontend/src/`](../frontend/src/)

| File | Role |
|------|------|
| [`services/api.ts`](../frontend/src/services/api.ts) | the single module that talks to the backend; all `fetch` calls live here |
| [`pages/Home.tsx`](../frontend/src/pages/Home.tsx) | the whole page: health banner + `FileUpload` + `ChatBox` |
| [`components/FileUpload.tsx`](../frontend/src/components/FileUpload.tsx) | pick a PDF, `POST` it, show pages/chunks indexed |
| [`components/ChatBox.tsx`](../frontend/src/components/ChatBox.tsx) | question input + running message list |
| [`components/Message.tsx`](../frontend/src/components/Message.tsx) | one user or assistant bubble |
| [`components/SourceList.tsx`](../frontend/src/components/SourceList.tsx) | the "Sources" block under an answer |

## How it calls the backend

`api.ts` reads **one** setting:

```ts
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5038'
```

| Function | Request | Backend endpoint |
|----------|---------|------------------|
| `checkHealth()` | `GET` | `/api/health` |
| `uploadPdf(file)` | `POST` multipart `file` | `/api/documents/upload` |
| `askQuestion(q, topK?)` | `POST` JSON `{ question, topK }` | `/api/chat` |

Errors: every call goes through one `request()` helper. A dead backend is caught
and rethrown as *"Could not reach the backend at … Is it running?"* instead of
the browser's bare "Failed to fetch"; a non-2xx response is unwrapped by
`readError()` (`{ message }` → `{ detail }` → `{ error }`) and thrown, and each
component shows it inline. `FileUpload` also pre-checks the file against
`VITE_MAX_UPLOAD_MB` so an oversized PDF is rejected instantly, before upload.

`VITE_API_URL` is inlined at **build** time. In Docker it is a build arg in
`docker-compose.yml` and must be the URL the **browser** uses (the host-published
backend port), not a compose hostname.

## The source list

`ChatResponse.sources` is `{ page, document, score }[]`. `SourceList` renders each
as `document — page N (score 0.842)`. Keeping sources visible is the point of RAG:
the user can check any claim against the cited page.

## How to change it

| Want to… | Do |
|----------|-----|
| Point at a different backend | set `VITE_API_URL` in `frontend/.env` (rebuild for Docker) |
| Send a custom `topK` | pass it to `askQuestion(q, topK)` in `ChatBox.tsx` |
| Restyle | `src/index.css` / `src/App.css` — plain CSS, no framework |
| Add streaming answers | `askQuestion` in `api.ts` is the one place to change the transport |

## Example flow

1. User picks `handbook.pdf`, clicks **Upload** → `uploadPdf` →
   `POST /api/documents/upload` → banner: "Indexed handbook.pdf — 44 pages, 168 chunks".
2. User types a question, hits **Send** → `askQuestion` → `POST /api/chat`.
3. The assistant bubble shows the answer; `SourceList` shows
   `handbook.pdf — page 12 (score 0.842)`.

> Upload works when Qdrant runs as a server (the normal mode — `docker compose
> up` sets it up). If you fell back to embedded on-disk Qdrant, step 1 shows
> *"Upload needs Qdrant in server mode…"* — index with `python ingest.py`
> instead. See [qdrant.md](qdrant.md).
