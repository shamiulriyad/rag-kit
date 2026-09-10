# Docs

One short guide per part of the kit. Each answers the same six questions:
**what** it is, **why** RAG needs it, **how** it works here, **where** the code
is, **how to change** it, and a small **example**.

Read them in roughly this order.

| # | Guide | Covers |
|---|-------|--------|
| 1 | [installation.md](installation.md) | Clone → install → configure → run, by hand or with Docker |
| 2 | [configuration.md](configuration.md) | Every environment variable, per service, and where it is read |
| 3 | [architecture.md](architecture.md) | How React, .NET and Python fit together and why the boundary is where it is |
| 4 | [rag-pipeline.md](rag-pipeline.md) | The 11 steps end to end, and the two entry points (`ingest.py`, `ask.py`) |
| 5 | [ingestion.md](ingestion.md) | Steps 1–4: PDF → text → clean → chunk (+ metadata / citations) |
| 6 | [embeddings.md](embeddings.md) | Step 5: turning text into vectors; Gemini vs local models |
| 7 | [qdrant.md](qdrant.md) | Step 6: storing and searching vectors; embedded vs server mode |
| 8 | [retrieval.md](retrieval.md) | Steps 8–11: query embedding → search → context → Gemini → answer + sources |
| 9 | [backend-connection.md](backend-connection.md) | The ASP.NET Core layer: what it forwards and what it must not do |
| 10 | [frontend-connection.md](frontend-connection.md) | The React UI: upload, ask, render sources |
| 11 | [troubleshooting.md](troubleshooting.md) | Symptom → cause → fix, per pipeline stage |
