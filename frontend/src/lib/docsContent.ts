export interface DocPage {
  id: string
  title: string
  body: string
}

export const docsPages: DocPage[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    body: `RAG Starter takes you from an empty folder to grounded answers in five steps: **Clone → Configure → Add PDF → Run → Ask**.

## Prerequisites
- Docker and Docker Compose
- A Google Gemini API key
- ~2 GB free disk for the vector store and model cache

## Quick start
\`\`\`bash
git clone https://github.com/shamiulriyad/rag-kit
cd rag-kit
cp .env.example .env      # then edit .env
docker compose up -d
\`\`\`

Open the frontend at \`http://localhost:5173\`, go to **Documents**, and drop in a PDF. Once it shows **Ready**, open **Knowledge Chat** and ask a question.`,
  },
  {
    id: 'architecture',
    title: 'Architecture',
    body: `The request path is a straight line:

\`\`\`
React  →  ASP.NET Core API  →  Python RAG service  →  Qdrant + Gemini
\`\`\`

Each layer has one job:

- **React** — the UI. It talks *only* to the .NET API.
- **ASP.NET Core** — the gateway. Validates uploads, enforces size limits, forwards ingestion and chat.
- **Python RAG** — the engine. Extraction, cleaning, chunking, embedding, retrieval, prompt assembly.
- **Qdrant** — the vector database, run as a server (not embedded/on-disk).
- **Gemini** — generates the final answer from retrieved context.

> The React frontend never calls the Python service directly. Keeping a single gateway means one place for auth, limits, logging and error shaping.`,
  },
  {
    id: 'rag-pipeline',
    title: 'RAG Pipeline',
    body: `Two pipelines share one vector space.

## Ingestion
\`\`\`
PDF → Extract → Clean → Chunk → Embed → Qdrant
\`\`\`

## Query
\`\`\`
Question → Embed → Retrieve → Context → Gemini → Answer + Sources
\`\`\`

Documents are processed once. Every question is embedded with the *same* model and searched against the *same* collection, so retrieval stays consistent.`,
  },
  {
    id: 'pdf-ingestion',
    title: 'PDF Ingestion',
    body: `You can ingest a document two ways.

## From the UI
Drag a PDF onto the **Documents** page. React sends it to \`POST /api/documents/upload\` on the .NET API, which streams it to the Python service's \`/ingest\` endpoint.

## From the CLI (developer fallback)
\`\`\`bash
python ingest.py --pdf handbook.pdf --recreate
\`\`\`

The CLI is a fallback, not the primary path — the upload button stays first-class.

## Scanned PDFs
If a PDF has little or no extractable text, ingestion stops with a clear message:

> This PDF appears to be scanned / image-based. OCR is required before indexing.

OCR is not run automatically for every file.`,
  },
  {
    id: 'embeddings',
    title: 'Embeddings',
    body: `The embedding model is configurable through \`.env\`:

\`\`\`
EMBEDDING_PROVIDER=huggingface
EMBEDDING_MODEL=BAAI/bge-m3
\`\`\`

\`bge-m3\` is multilingual — keep a multilingual model if your documents contain Bangla or mixed languages. Do not hardcode an English-only model.

Changing the embedding model means the vector dimensions change, so you must re-ingest your documents (\`--recreate\`).`,
  },
  {
    id: 'qdrant',
    title: 'Qdrant',
    body: `Qdrant runs as a **standalone server**, added to \`docker-compose.yml\` as its own service.

\`\`\`
QDRANT_URL=http://qdrant:6333      # inside Docker (service name)
QDRANT_URL=http://localhost:6333   # local, non-Docker dev
\`\`\`

Embedded / on-disk Qdrant is not used for the normal application flow — it locks the store and causes \`/ingest\` to fail with 501. The server mode has no such limitation.

To wipe and rebuild a collection, ingest with \`--recreate\`.`,
  },
  {
    id: 'retrieval',
    title: 'Retrieval',
    body: `At query time the question is embedded and the top **K** most similar chunks are pulled from Qdrant (cosine similarity).

\`\`\`
CHUNK_SIZE=800
CHUNK_OVERLAP=120
TOP_K=5
\`\`\`

- **Larger chunks** keep more context per hit but dilute relevance.
- **More overlap** reduces the chance of splitting an answer across a boundary.
- **Higher top-K** gives Gemini more to work with, at the cost of prompt size and noise.

Each retrieved chunk carries its document name, page number and similarity score — that is what powers the source cards.`,
  },
  {
    id: 'gemini',
    title: 'Gemini',
    body: `Retrieved chunks are assembled into a context block and sent to Gemini with the user's question.

\`\`\`
LLM_PROVIDER=gemini
GEMINI_MODEL=gemini-1.5-pro
GEMINI_API_KEY=your-key-here
\`\`\`

The prompt instructs the model to answer **only** from the provided context and to say when the answer is not present. The response is returned with the list of sources used.`,
  },
  {
    id: 'backend-connection',
    title: 'Backend Connection',
    body: `The .NET API is the only backend the frontend knows about.

\`\`\`
POST /api/documents/upload   → forwards to Python /ingest
POST /api/chat               → forwards to Python /query
GET  /api/health             → aggregates API + RAG status
\`\`\`

Upload limits are enforced here first:

\`\`\`
Upload__MaxBytes=209715200     # ~200 MB, ASP.NET / Kestrel + multipart
\`\`\`

Errors are shaped as JSON so the UI never shows a bare "Failed to fetch":

\`\`\`json
{ "success": false, "message": "PDF exceeds the configured upload limit." }
\`\`\``,
  },
  {
    id: 'frontend-connection',
    title: 'Frontend Connection',
    body: `The frontend reads one variable at build time:

\`\`\`
VITE_API_URL=http://localhost:5038
VITE_MAX_UPLOAD_MB=200
\`\`\`

\`VITE_API_URL\` must be the URL the **browser** uses to reach the .NET API — the host-published port, not a Docker service name. All network calls go through \`src/services/api.ts\`; nothing else in the app calls \`fetch\` directly.`,
  },
  {
    id: 'configuration',
    title: 'Configuration',
    body: `Everything tunable lives in \`.env\`. The **Settings** page mirrors these values for reference but only stores UI preferences in your browser — it never holds real secrets.

| Variable | Purpose |
| --- | --- |
| \`GEMINI_API_KEY\` | Gemini auth (secret) |
| \`GEMINI_MODEL\` | e.g. \`gemini-1.5-pro\` |
| \`EMBEDDING_MODEL\` | e.g. \`BAAI/bge-m3\` |
| \`QDRANT_URL\` | Qdrant server URL |
| \`QDRANT_COLLECTION\` | Collection name |
| \`CHUNK_SIZE\` / \`CHUNK_OVERLAP\` | Chunking |
| \`TOP_K\` | Chunks retrieved per query |
| \`Upload__MaxBytes\` / \`MAX_UPLOAD_MB\` | Upload limits |`,
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    body: `## \`/ingest\` returns 501
You are on embedded Qdrant. Switch to the Qdrant **server** service and set \`QDRANT_URL\` to it.

## Upload fails immediately
The file is over \`Upload__MaxBytes\` / \`MAX_UPLOAD_MB\`. Raise the limits or split the PDF.

## "Failed to fetch" in the browser
The .NET API is not running or \`VITE_API_URL\` is wrong. Check \`docker compose ps\` and the published port.

## Answers ignore a document
It may still be **Processing**, or its status is **Failed** (often a scanned PDF needing OCR).

## Bangla answers look wrong
You are probably on an English-only embedding model. Set \`EMBEDDING_MODEL=BAAI/bge-m3\` and re-ingest with \`--recreate\`.`,
  },
]
