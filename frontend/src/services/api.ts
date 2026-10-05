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
export async function request<T>(path: string, init?: RequestInit, isRetry = false): Promise<T> {
  return (await requestFull<T>(path, init, isRetry)).data
}

/** Same as request(), but also hands back the Response so callers can read headers (X-Total-Count). */
export async function requestFull<T>(
  path: string,
  init?: RequestInit,
  isRetry = false,
): Promise<{ data: T; res: Response }> {
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
    if (newToken) return requestFull<T>(path, init, true)
  }

  if (!res.ok) throw new ApiError(res.status, await readError(res))

  const body = await res.json()
  if (isEnvelope(body)) {
    if (!body.success) throw new ApiError(res.status, body.message ?? 'Request failed.')
    return { data: body.data as T, res }
  }
  return { data: body as T, res }
}

export function checkHealth(): Promise<Health> {
  return request<Health>('/api/health')
}

// --- Chat -----------------------------------------------------------------
// Mirrors backend/DTOs/Chat/ChatDtos.cs. A session belongs to one Knowledge Base;
// questions are asked inside a session so the exchange is persisted.

export interface ChatSessionSummary {
  id: string
  knowledgeBaseId: string
  knowledgeBaseName: string
  title: string
  messageCount: number
  createdAt: string
  updatedAt: string
}

export interface ChatSourceDto {
  documentId: string | null
  documentName: string | null
  page: number | null
  relevanceScore: number
  excerpt: string
}

export interface ChatMessageDto {
  id: string
  role: string
  content: string
  createdAt: string
  sources: ChatSourceDto[]
}

export interface AskMessageResult {
  sessionId: string
  messageId: string
  answer: string
  sources: ChatSourceDto[]
}

export function listChatSessions(): Promise<ChatSessionSummary[]> {
  return request('/api/chat/sessions')
}

export interface Paged<T> {
  items: T[]
  /** Rows that exist in total; larger than items.length when the server capped the page. */
  total: number
}

/** First page (up to 200) of conversations plus the real total, for the history view. */
export async function listChatSessionsPage(): Promise<Paged<ChatSessionSummary>> {
  const { data, res } = await requestFull<ChatSessionSummary[]>('/api/chat-history')
  return { items: data, total: Number(res.headers.get('X-Total-Count') ?? data.length) }
}

export function getChatSession(id: string): Promise<{ session: ChatSessionSummary; messages: ChatMessageDto[] }> {
  return request(`/api/chat/sessions/${id}`)
}

export function createChatSession(knowledgeBaseId: string, title?: string): Promise<ChatSessionSummary> {
  return request('/api/chat/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ knowledgeBaseId, title }),
  })
}

export function renameChatSession(id: string, title: string): Promise<ChatSessionSummary> {
  return request(`/api/chat-history/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
}

export function deleteChatSession(id: string): Promise<void> {
  return request(`/api/chat-history/${id}`, { method: 'DELETE' })
}

export function askInSession(sessionId: string, question: string, topK?: number): Promise<AskMessageResult> {
  return request(`/api/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, topK }),
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
  /** True once the user has opened the emailed verification link (or finished a password reset). */
  emailVerified: boolean
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

// --- Knowledge Bases --------------------------------------------------
// Mirrors backend/DTOs/KnowledgeBases/KnowledgeBaseDtos.cs.

export interface KnowledgeBaseSummary {
  id: string
  name: string
  description: string
  documents: number
  chunks: number
  createdAt: string
  updatedAt: string
  role: string
}

export interface KnowledgeBaseStats {
  id: string
  documentCount: number
  chunkCount: number
  completedDocuments: number
  processingDocuments: number
  failedDocuments: number
  storageBytes: number
}

export interface KnowledgeBaseMember {
  id: string
  userId: string
  email: string
  fullName: string
  role: string
  createdAt: string
}

export function listKnowledgeBases(): Promise<KnowledgeBaseSummary[]> {
  return request('/api/knowledge-bases')
}

export function getKnowledgeBase(id: string): Promise<KnowledgeBaseSummary> {
  return request(`/api/knowledge-bases/${id}`)
}

export function getKnowledgeBaseStats(id: string): Promise<KnowledgeBaseStats> {
  return request(`/api/knowledge-bases/${id}/stats`)
}

export function listKnowledgeBaseMembers(id: string): Promise<KnowledgeBaseMember[]> {
  return request(`/api/knowledge-bases/${id}/members`)
}

export function createKnowledgeBase(name: string, description: string): Promise<KnowledgeBaseSummary> {
  return request('/api/knowledge-bases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description: description || null }),
  })
}

export function updateKnowledgeBase(
  id: string,
  patch: { name?: string; description?: string },
): Promise<KnowledgeBaseSummary> {
  return request(`/api/knowledge-bases/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
}

export function deleteKnowledgeBase(id: string): Promise<void> {
  return request(`/api/knowledge-bases/${id}`, { method: 'DELETE' })
}

// --- Documents --------------------------------------------------------
// Mirrors backend/DTOs/Documents/DocumentDtos.cs. Documents are always
// scoped to a Knowledge Base - there is no "list every document" endpoint.

export interface DocumentRecord {
  id: string
  knowledgeBaseId: string
  name: string
  sizeBytes: number
  fileType: string
  pages: number | null
  chunks: number | null
  status: string
  note: string | null
  uploadedAt: string
  processedAt: string | null
}

export function listDocuments(knowledgeBaseId: string): Promise<DocumentRecord[]> {
  return request(`/api/knowledge-bases/${knowledgeBaseId}/documents`)
}

export function getDocument(id: string): Promise<DocumentRecord> {
  return request(`/api/documents/${id}`)
}

export function uploadDocument(knowledgeBaseId: string, file: File): Promise<DocumentRecord> {
  const form = new FormData()
  form.append('file', file)
  return request(`/api/knowledge-bases/${knowledgeBaseId}/documents`, { method: 'POST', body: form })
}

export function deleteDocument(id: string): Promise<void> {
  return request(`/api/documents/${id}`, { method: 'DELETE' })
}

export function reprocessDocument(id: string): Promise<DocumentRecord> {
  return request(`/api/documents/${id}/reprocess`, { method: 'POST' })
}

export { BASE_URL }

// --- Analytics / usage / activity / notifications --------------------------
// Mirror backend/DTOs/Analytics, Billing and the Activity/Notification services.

export interface AnalyticsOverview {
  totalKnowledgeBases: number
  totalDocuments: number
  totalChunks: number
  totalQuestionsThisMonth: number
  storageBytes: number
  mostUsedKnowledgeBases: { id: string; name: string; documents: number; chunks: number }[]
}

export interface TimeSeriesPoint {
  date: string
  count: number
}

export interface UsageSummary {
  planCode: string
  documents: number
  maxDocuments: number
  storageBytes: number
  maxStorageBytes: number
  chunks: number
  maxChunks: number
  questionsThisMonth: number
  maxQuestionsPerMonth: number
  knowledgeBases: number
  maxKnowledgeBases: number
}

export interface ActivityLogDto {
  id: string
  action: string
  entityType: string
  entityId: string | null
  metadata: string | null
  createdAt: string
}

export interface NotificationDto {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  return request('/api/analytics/overview')
}

export function getQuestionsOverTime(days = 7): Promise<TimeSeriesPoint[]> {
  return request(`/api/analytics/questions?days=${days}`)
}

export function getDocumentsOverTime(days = 28): Promise<TimeSeriesPoint[]> {
  return request(`/api/analytics/documents?days=${days}`)
}

export function getUsage(): Promise<UsageSummary> {
  return request('/api/analytics/usage')
}

export function listActivity(limit = 100): Promise<ActivityLogDto[]> {
  return request(`/api/activity?limit=${limit}`)
}

export function clearActivity(): Promise<void> {
  return request('/api/activity', { method: 'DELETE' })
}

export function listNotifications(): Promise<NotificationDto[]> {
  return request('/api/notifications')
}

export function markNotificationRead(id: string): Promise<void> {
  return request(`/api/notifications/${id}/read`, { method: 'PUT' })
}

export function markAllNotificationsRead(): Promise<void> {
  return request('/api/notifications/read-all', { method: 'PUT' })
}

export function getHealthDetail(): Promise<Record<string, string>> {
  return request('/api/health')
}

export function activatePlan(planCode: string): Promise<{ planCode: string; status: string }> {
  return request('/api/billing/mock-activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planCode }),
  })
}

// --- Workspaces / team (backend/DTOs/Teams/WorkspaceDtos.cs) ----------------

export interface WorkspaceSummary {
  id: string
  name: string
  ownerId: string
  memberCount: number
  createdAt: string
  updatedAt: string
  isPersonal: boolean
}

export interface WorkspaceMember {
  id: string
  name: string
  email: string
  role: 'Owner' | 'Admin' | 'Member'
  status: 'active' | 'pending'
  createdAt: string
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export function listWorkspaces(): Promise<WorkspaceSummary[]> {
  return request('/api/workspaces')
}

export function createWorkspace(name: string): Promise<WorkspaceSummary> {
  return request('/api/workspaces', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ name }) })
}

export function updateWorkspace(id: string, name: string): Promise<WorkspaceSummary> {
  return request(`/api/workspaces/${id}`, { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify({ name }) })
}

export function listWorkspaceMembers(id: string): Promise<WorkspaceMember[]> {
  return request(`/api/workspaces/${id}/members`)
}

export function inviteWorkspaceMember(id: string, email: string, role: string): Promise<WorkspaceMember> {
  return request(`/api/workspaces/${id}/members`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ email, role }),
  })
}

export function updateWorkspaceMemberRole(id: string, memberId: string, role: string): Promise<WorkspaceMember> {
  return request(`/api/workspaces/${id}/members/${memberId}`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({ role }),
  })
}

export function removeWorkspaceMember(id: string, memberId: string): Promise<void> {
  return request(`/api/workspaces/${id}/members/${memberId}`, { method: 'DELETE' })
}

// --- Account recovery & email verification ---------------------------------

/** Always resolves for a well-formed email - the server never says whether an account exists. */
export async function forgotPassword(email: string): Promise<void> {
  await request<void>('/api/auth/forgot-password', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await request<void>('/api/auth/reset-password', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ token, newPassword }),
  })
}

export async function verifyEmail(token: string): Promise<void> {
  await request<void>('/api/auth/verify-email', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ token }),
  })
}

export async function resendVerification(): Promise<void> {
  await request<void>('/api/auth/resend-verification', { method: 'POST' })
}

// --- API keys (backend/Controllers/ApiKeysController.cs) -------------------
// Send a key as `X-API-Key: <key>` or `Authorization: Bearer <key>`.

export interface ApiKeyItem {
  id: string
  name: string
  /** First characters of the key - enough to recognise it; the full key is only shown once. */
  prefix: string
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

export interface CreatedApiKey {
  id: string
  name: string
  /** The full secret. Returned only by the create call - it cannot be retrieved again. */
  rawKey: string
  createdAt: string
}

export function listApiKeys(): Promise<ApiKeyItem[]> {
  return request<ApiKeyItem[]>('/api/api-keys')
}

export function createApiKey(name: string): Promise<CreatedApiKey> {
  return request<CreatedApiKey>('/api/api-keys', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ name }),
  })
}

export async function revokeApiKey(id: string): Promise<void> {
  await request<void>(`/api/api-keys/${id}`, { method: 'DELETE' })
}

// --- Per-user RAG settings (backend/Controllers/SettingsController.cs) -----
// Chunking applies to documents processed after saving; retrieval applies to the next question.
// Pro and Team plans only - the server answers 422 with an upgrade message on Free.

export interface UserSettings {
  theme: string
  defaultModel: string
  embeddingModel: string
  chunkSize: number
  chunkOverlap: number
  topK: number
  similarityThreshold: number
  temperature: number
}

export type RagSettingsPatch = Partial<
  Pick<UserSettings, 'chunkSize' | 'chunkOverlap' | 'topK' | 'similarityThreshold'>
>

export function getSettings(): Promise<UserSettings> {
  return request<UserSettings>('/api/settings')
}

export function updateSettings(patch: RagSettingsPatch): Promise<UserSettings> {
  return request<UserSettings>('/api/settings', {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify(patch),
  })
}

/** Ends every other session and returns a fresh token pair for this device. */
export function changePassword(currentPassword: string, newPassword: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/users/me/password', {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}
