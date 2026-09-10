// The single place the frontend talks to the backend.
// React -> .NET backend -> Python RAG service. React never calls Python directly.

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5038'

export interface Source {
  page: number | null
  document: string
  score: number
}

export interface ChatResponse {
  answer: string
  sources: Source[]
}

export interface UploadResponse {
  document: string
  pages: number
  chunks: number
  recreated: boolean
}

export interface Health {
  status: string
  rag: string
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    // Backend sends { message }; FastAPI sends { detail }; older code used { error }.
    return body.message ?? body.detail ?? body.error ?? res.statusText
  } catch {
    return res.statusText || `HTTP ${res.status}`
  }
}

// One place to turn a fetch into JSON, so a dead backend reads as a real
// sentence instead of the browser's bare "Failed to fetch".
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, init)
  } catch {
    throw new Error(
      `Could not reach the backend at ${BASE_URL}. Is it running? (cd backend && dotnet run)`,
    )
  }
  if (!res.ok) throw new Error(await readError(res))
  return res.json() as Promise<T>
}

export function checkHealth(): Promise<Health> {
  return request<Health>('/api/health')
}

export function uploadPdf(file: File): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file', file)
  return request<UploadResponse>('/api/documents/upload', { method: 'POST', body: form })
}

export interface AskOptions {
  topK?: number
  /** Optional document scope for the retrieval step; the backend may ignore it. */
  documentId?: string
}

export function askQuestion(
  question: string,
  opts: AskOptions = {},
): Promise<ChatResponse> {
  return request<ChatResponse>('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, topK: opts.topK, documentId: opts.documentId }),
  })
}

export { BASE_URL }
