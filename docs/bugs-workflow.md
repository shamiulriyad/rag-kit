# Workflow bugs: upload → ingest → chat

Found by reading the document pipeline end to end
(`DocumentsController` → `DocumentService` → background worker → Python `/ingest` → Qdrant → `/query`).

## 1. Python `/ingest` blocks the whole RAG service (high)

**Where:** `rag/main.py`, `ingest()`.

`ingest` is an `async def` route that calls the synchronous, CPU/network-heavy
`ingest_document(...)` (PDF parsing, embedding, Qdrant writes) directly. That freezes the
event loop for the whole ingest, which can take minutes for a large PDF (the backend allows
600 s). While it runs, `/health` and every `/query` (chat) request hang, and the backend's
health check reports the service as down.

**Fix:** run the blocking call in a worker thread with `run_in_threadpool`.

## 2. Documents stuck in `Processing` forever (high)

**Where:** `backend/Services/DocumentService.cs`, `ProcessJobAsync` / `ClaimNextQueuedJobAsync`.

- `ProcessJobAsync` only catches `RagException` / `AppException`. Any other failure
  (storage download error, IO error, DB error) escapes. The background loop logs it and moves
  on, but the job and document stay `Processing` and are never picked up again.
- If the backend restarts or crashes mid-ingest, the same thing happens. The claim query only
  looks at `Queued` jobs, so an orphaned `Processing` job is never recovered.

**Fix:** treat any non-cancellation exception as a job failure (going through the same
retry/fail path), and have the claim step re-queue (or fail, once attempts are exhausted)
`Processing` jobs that have not been updated for longer than the RAG timeout.

## 3. Knowledge base `DocumentCount` goes wrong on delete (medium)

**Where:** `DocumentService.DeleteAsync`.

`DocumentCount` is only incremented when a document is first *successfully* processed, but
`DeleteAsync` always decrements it. Deleting a failed, queued or processing document lowers
the count for a document that was never counted, so it drifts below the real value.

**Fix:** decrement only when `ProcessedAt` is set.

## 4. Failed upload leaves the document in `Uploading` (medium)

**Where:** `DocumentService.UploadAsync`.

The `catch` only handles `AppException`. If the storage upload throws anything else (IO
error, Supabase `HttpRequestException`), the `Document` row stays `Uploading` with no job and
can never be reprocessed (no `StoragePath`).

**Fix:** mark the document `Failed` for any non-cancellation exception.

## 5. Reprocess can queue duplicate jobs (low)

**Where:** `DocumentService.ReprocessAsync`.

Clicking "reprocess" while a job is already `Queued`/`Processing` adds another job. Two jobs
then ingest the same document one after another and double-count chunk and usage stats.

**Fix:** reject reprocess while the document has an active job.
