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

// Thrown for any non-OK HTTP response so callers can branch on `status`
// instead of parsing the message string.
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const STATUS_FALLBACK: Record<number, string> = {
  401: 'Your session has expired. Please sign in again.',
  403: "You don't have permission to do that.",
  404: "That couldn't be found. It may have been moved or deleted.",
  409: 'That already exists or conflicts with something else.',
  422: 'Some of the information provided is invalid.',
  429: "You're sending requests too quickly. Please wait a moment and try again.",
  500: 'Something went wrong on the server. Please try again shortly.',
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    // Backend sends { message } (ApiResponse envelope) or { errors: [...] }; FastAPI
    // sends { detail }; older code used { error }.
    return (
      body.message ??
      (Array.isArray(body.errors) && body.errors.length ? body.errors.join(' ') : null) ??
      body.detail ??
      body.error ??
      STATUS_FALLBACK[res.status] ??
      res.statusText
    )
  } catch {
    return STATUS_FALLBACK[res.status] ?? res.statusText ?? `HTTP ${res.status}`
  }
}

// --- Auth token plumbing -----------------------------------------------
// api.ts stays framework-agnostic (no React import) - lib/auth.tsx drives
// these so every request carries the current session, and a 401 gets one
// silent refresh-and-retry before giving up.

let accessToken: string | null = null
export function setAccessToken(token: string | null) {
  accessToken = token
}

type RefreshHandler = () => Promise<string | null>
let refreshHandler: RefreshHandler | null = null
export function setRefreshHandler(fn: RefreshHandler | null) {
  refreshHandler = fn
}

function withAuth(init?: RequestInit): RequestInit {
  if (!accessToken) return init ?? {}
  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${accessToken}`)
  return { ...init, headers }
}

interface ApiEnvelope<T> {
  success: boolean
  data: T
  message: string | null
  errors: string[]
}

function isEnvelope(body: unknown): body is ApiEnvelope<unknown> {
  return !!body && typeof body === 'object' && 'success' in (body as Record<string, unknown>)
}

// One place to turn a fetch into JSON, so a dead backend reads as a real
// sentence instead of the browser's bare "Failed to fetch". Most backend
// controllers wrap responses in { success, data, message, errors } (see
// DTOs/Common/ApiResponse.cs) - this unwraps `data` automatically. A few
// endpoints (e.g. /api/health) return a raw object instead; those pass
// through unchanged since they have no `success` field to detect.
async function request<T>(path: string, init?: RequestInit, isRetry = false): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, withAuth(init))
  } catch {
    throw new Error(
      `Could not reach the backend at ${BASE_URL}. Is it running? (cd backend && dotnet run)`,
    )
  }

  if (
    res.status === 401 &&
    !isRetry &&
    accessToken &&
    refreshHandler &&
    !path.startsWith('/api/auth/')
  ) {
    const newToken = await refreshHandler()
    if (newToken) return request<T>(path, init, true)
  }

  if (!res.ok) throw new ApiError(res.status, await readError(res))

  const body = await res.json()
  if (isEnvelope(body)) {
    if (!body.success) throw new ApiError(res.status, body.message ?? 'Request failed.')
    return body.data as T
  }
  return body as T
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

// --- Auth -----------------------------------------------------------------
// Mirrors backend/DTOs/Auth/AuthDtos.cs exactly.

export interface UserProfile {
  id: string
  email: string
  fullName: string
  avatarUrl: string | null
  role: string
  planCode: string
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
}

export interface AuthResponse {
  accessToken: string
  accessTokenExpiresAt: string
  refreshToken: string
  user: UserProfile
}

export function register(fullName: string, email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, email, password }),
  })
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
}

export function refreshTokens(refreshToken: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
}

export async function logout(refreshToken: string): Promise<void> {
  await request<void>('/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
}

export function getMe(): Promise<UserProfile> {
  return request<UserProfile>('/api/users/me')
}

export { BASE_URL }
