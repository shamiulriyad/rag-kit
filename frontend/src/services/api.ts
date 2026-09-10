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
    return body.error ?? body.detail ?? res.statusText
  } catch {
    return res.statusText || `HTTP ${res.status}`
  }
}

export async function checkHealth(): Promise<Health> {
  const res = await fetch(`${BASE_URL}/api/health`)
  if (!res.ok) throw new Error(await readError(res))
  return res.json()
}

export async function uploadPdf(file: File): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`${BASE_URL}/api/documents/upload`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error(await readError(res))
  return res.json()
}

export async function askQuestion(question: string, topK?: number): Promise<ChatResponse> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, topK }),
  })
  if (!res.ok) throw new Error(await readError(res))
  return res.json()
}
