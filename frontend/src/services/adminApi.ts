/* Typed client for the platform-admin API (backend/Controllers/Admin, DTOs/Admin/AdminDtos.cs).
   Every call needs the PlatformAdmin policy on the server - nothing here is a permission check. */

import { request, type TimeSeriesPoint } from './api'
import type { TicketMessage, TicketStatus } from './supportApi'

export interface Paged<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface AdminAccess {
  isAdmin: boolean
  permissions: string[]
}

export interface AdminDashboard {
  days: number
  totalUsers: number
  newUsers: number
  activeUsers: number
  suspendedUsers: number
  workspaces: number
  knowledgeBases: number
  documents: number
  chunks: number
  storageBytes: number
  questions: number
  totalQuestions: number
  failedJobs: number
  pendingJobs: number
  paidUsers: number
  estimatedMrr: number
  plans: { plan: string; users: number; monthlyPrice: number }[]
  documentStatuses: { status: string; count: number }[]
}

export interface AdminTimeSeries {
  signups: TimeSeriesPoint[]
  questions: TimeSeriesPoint[]
  documentsCompleted: TimeSeriesPoint[]
  documentsFailed: TimeSeriesPoint[]
}

export interface AdminUserItem {
  id: string
  email: string
  fullName: string
  role: string
  plan: string
  workspaces: number
  status: 'active' | 'suspended'
  createdAt: string
  lastLoginAt: string | null
}

export interface AdminUserDetail {
  id: string
  email: string
  fullName: string
  role: string
  plan: string
  status: 'active' | 'suspended'
  createdAt: string
  lastLoginAt: string | null
  workspaces: { id: string; name: string; role: string; members: number }[]
  usage: {
    knowledgeBases: number
    documents: number
    chunks: number
    storageBytes: number
    questionsTotal: number
    questionsThisMonth: number
  }
  activity: { action: string; entityType: string; createdAt: string }[]
  security: {
    activeSessions: number
    lastLoginAt: string | null
    isSuspended: boolean
    suspendedAt: string | null
    suspensionReason: string | null
  }
}

export interface AdminWorkspaceItem {
  id: string
  name: string
  ownerId: string
  ownerEmail: string
  members: number
  knowledgeBases: number
  documents: number
  storageBytes: number
  createdAt: string
}

export interface AdminKnowledgeBaseItem {
  id: string
  name: string
  ownerEmail: string
  workspace: string | null
  documents: number
  chunks: number
  createdAt: string
}

export interface AdminWorkspaceDetail {
  workspace: AdminWorkspaceItem
  members: { email: string; role: string; status: string }[]
  knowledgeBases: AdminKnowledgeBaseItem[]
}

export interface AdminDocumentItem {
  id: string
  fileName: string
  knowledgeBase: string
  ownerEmail: string
  status: string
  fileSize: number
  chunks: number | null
  error: string | null
  createdAt: string
}

export interface AdminInvitationItem {
  id: string
  workspace: string
  email: string
  role: string
  status: string
  createdAt: string
}

export interface AdminJobItem {
  id: string
  documentId: string
  document: string
  workspace: string
  status: string
  attempts: number
  maxAttempts: number
  durationSeconds: number | null
  error: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

export interface AdminJobDetail {
  job: AdminJobItem
  knowledgeBaseId: string
  knowledgeBase: string
  ownerEmail: string
  documentStatus: string
  stages: { name: string; state: 'done' | 'active' | 'pending' | 'failed'; at: string | null }[]
  log: { at: string; message: string }[]
}

export interface ServiceHealth {
  id: string
  name: string
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  responseMs: number | null
  checkedAt: string
  detail: string
}

export interface AdminPlanItem {
  code: string
  name: string
  priceMonthly: number
  priceYearly: number
  users: number
  maxDocuments: number
  maxStorageBytes: number
  maxQuestionsPerMonth: number
  maxKnowledgeBases: number
}

export interface AdminSubscriptionItem {
  id: string
  userEmail: string
  plan: string
  status: string
  isMock: boolean
  startedAt: string
  currentPeriodEnd: string | null
}

export interface AdminAuditItem {
  id: string
  at: string
  actor: string
  action: string
  resourceType: string
  resourceId: string | null
  result: string
  details: string | null
}

export interface AdminSearchHit {
  type: 'user' | 'workspace' | 'document'
  id: string
  label: string
  sub: string | null
}

export interface AdminCmsItem {
  id: string
  type: string
  slug: string
  title: string
  status: 'draft' | 'published'
  version: number
  author: string
  updatedBy: string
  updatedAt: string
  publishedAt: string | null
}

export interface AdminCmsDetail extends Omit<AdminCmsItem, 'author' | 'updatedBy'> {
  summary: string
  body: string
  author: string
  updatedBy: string
  createdAt: string
  versions: { version: number; title: string; editedBy: string; at: string }[]
}

export interface AdminCmsSave {
  type: string
  slug?: string
  title: string
  summary: string
  body: string
}

export interface AdminSecurityEvent {
  id: string
  at: string
  type: string
  email: string | null
  ip: string | null
  path: string | null
  details: string | null
}

export interface AdminAdminUser {
  id: string
  email: string
  fullName: string
  role: string
  status: 'active' | 'suspended'
  lastLoginAt: string | null
}

export interface AdminRole {
  name: string
  description: string
  permissions: string[]
}

export interface AdminApiKey {
  id: string
  name: string
  prefix: string
  owner: string
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
  status: 'active' | 'revoked' | 'expired'
}

export interface AdminUsageResponse {
  monthly: { month: string; questions: number; documents: number; storageBytes: number; chunks: number; activeUsers: number }[]
  topUsers: { email: string; plan: string; questions: number; documents: number; storageBytes: number }[]
  estimate: { aiCostPerQuestion: number | null; aiCostThisMonth: number | null; paidUsers: number; estimatedMonthlyRevenue: number }
}

export interface AdminBillingEvent {
  id: string
  at: string
  type: string
  userEmail: string
  plan: string
  monthlyPrice: number
  source: 'simulated' | 'provider'
}

export interface AdminTicketItem {
  id: string
  subject: string
  status: TicketStatus
  userId: string
  userEmail: string
  messages: number
  createdAt: string
  updatedAt: string
}

export interface AdminTicketDetail {
  id: string
  subject: string
  status: TicketStatus
  userId: string
  userEmail: string
  userPlan: string
  createdAt: string
  updatedAt: string
  messages: TicketMessage[]
}

export interface AdminSettings {
  maintenanceMode: boolean
  maintenanceMessage: string
  signupsEnabled: boolean
  updatedAt: string | null
  updatedBy: string | null
}

export const CMS_TYPES: { value: string; label: string }[] = [
  { value: 'homepage', label: 'Homepage' },
  { value: 'feature', label: 'Feature' },
  { value: 'usecase', label: 'Use case' },
  { value: 'faq', label: 'FAQ' },
  { value: 'blog', label: 'Blog' },
  { value: 'docs', label: 'Documentation' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'pricing', label: 'Pricing content' },
]

function qs(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

const json = (body: unknown, method = 'POST'): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const adminApi = {
  access: () => request<AdminAccess>('/api/admin/access'),
  dashboard: (days: number) => request<AdminDashboard>(`/api/admin/dashboard${qs({ days })}`),
  timeseries: (days: number) => request<AdminTimeSeries>(`/api/admin/timeseries${qs({ days })}`),
  search: (q: string) => request<AdminSearchHit[]>(`/api/admin/search${qs({ q })}`),

  users: (p: { search?: string; status?: string; plan?: string; page: number; pageSize?: number }) =>
    request<Paged<AdminUserItem>>(`/api/admin/users${qs(p)}`),
  user: (id: string) => request<AdminUserDetail>(`/api/admin/users/${id}`),
  suspendUser: (id: string, reason: string) =>
    request<void>(`/api/admin/users/${id}/suspend`, json({ reason })),
  reactivateUser: (id: string) => request<void>(`/api/admin/users/${id}/reactivate`, { method: 'POST' }),
  setUserPlan: (id: string, planCode: string) =>
    request<void>(`/api/admin/users/${id}/plan`, json({ planCode }, 'PUT')),

  workspaces: (p: { search?: string; page: number; pageSize?: number }) =>
    request<Paged<AdminWorkspaceItem>>(`/api/admin/workspaces${qs(p)}`),
  workspace: (id: string) => request<AdminWorkspaceDetail>(`/api/admin/workspaces/${id}`),
  knowledgeBases: (p: { search?: string; page: number; pageSize?: number }) =>
    request<Paged<AdminKnowledgeBaseItem>>(`/api/admin/knowledge-bases${qs(p)}`),
  documents: (p: { search?: string; status?: string; page: number; pageSize?: number }) =>
    request<Paged<AdminDocumentItem>>(`/api/admin/documents${qs(p)}`),
  invitations: (p: { status?: string; page: number; pageSize?: number }) =>
    request<Paged<AdminInvitationItem>>(`/api/admin/invitations${qs(p)}`),

  jobs: (p: { status?: string; search?: string; page: number; pageSize?: number }) =>
    request<Paged<AdminJobItem>>(`/api/admin/jobs${qs(p)}`),
  job: (id: string) => request<AdminJobDetail>(`/api/admin/jobs/${id}`),
  retryJob: (id: string) => request<void>(`/api/admin/jobs/${id}/retry`, { method: 'POST' }),
  reprocessDocument: (id: string) =>
    request<void>(`/api/admin/documents/${id}/reprocess`, { method: 'POST' }),

  health: () => request<{ services: ServiceHealth[]; incidentsTracked: boolean }>('/api/admin/health'),
  plans: () => request<AdminPlanItem[]>('/api/admin/plans'),
  subscriptions: (p: { page: number; pageSize?: number }) =>
    request<Paged<AdminSubscriptionItem>>(`/api/admin/subscriptions${qs(p)}`),
  audit: (p: { search?: string; result?: string; page: number; pageSize?: number }) =>
    request<Paged<AdminAuditItem>>(`/api/admin/audit${qs(p)}`),

  cms: (p: { type?: string; status?: string; search?: string; page: number; pageSize?: number }) =>
    request<Paged<AdminCmsItem>>(`/api/admin/cms${qs(p)}`),
  cmsItem: (id: string) => request<AdminCmsDetail>(`/api/admin/cms/${id}`),
  createCms: (body: AdminCmsSave) => request<AdminCmsDetail>('/api/admin/cms', json(body)),
  updateCms: (id: string, body: AdminCmsSave) => request<AdminCmsDetail>(`/api/admin/cms/${id}`, json(body, 'PUT')),
  publishCms: (id: string) => request<void>(`/api/admin/cms/${id}/publish`, { method: 'POST' }),
  unpublishCms: (id: string) => request<void>(`/api/admin/cms/${id}/unpublish`, { method: 'POST' }),
  restoreCms: (id: string, version: number) =>
    request<AdminCmsDetail>(`/api/admin/cms/${id}/restore/${version}`, { method: 'POST' }),

  securityEvents: (p: { search?: string; type?: string; page: number; pageSize?: number }) =>
    request<Paged<AdminSecurityEvent>>(`/api/admin/security/events${qs(p)}`),
  rateLimitEvents: (p: { search?: string; page: number; pageSize?: number }) =>
    request<Paged<AdminSecurityEvent>>(`/api/admin/security/rate-limits${qs(p)}`),
  admins: () => request<AdminAdminUser[]>('/api/admin/security/admins'),
  roles: () => request<AdminRole[]>('/api/admin/security/roles'),
  apiKeys: (p: { search?: string; status?: string; page: number; pageSize?: number }) =>
    request<Paged<AdminApiKey>>(`/api/admin/security/api-keys${qs(p)}`),
  revokeApiKey: (id: string) => request<void>(`/api/admin/security/api-keys/${id}/revoke`, { method: 'POST' }),

  usage: (months: number) => request<AdminUsageResponse>(`/api/admin/usage${qs({ months })}`),
  billingEvents: (p: { page: number; pageSize?: number }) =>
    request<Paged<AdminBillingEvent>>(`/api/admin/billing-events${qs(p)}`),

  tickets: (p: { status?: string; search?: string; userId?: string; page: number; pageSize?: number }) =>
    request<Paged<AdminTicketItem>>(`/api/admin/support${qs(p)}`),
  ticket: (id: string) => request<AdminTicketDetail>(`/api/admin/support/${id}`),
  replyTicket: (id: string, body: string) => request<AdminTicketDetail>(`/api/admin/support/${id}/reply`, json({ body })),
  setTicketStatus: (id: string, status: string) =>
    request<void>(`/api/admin/support/${id}/status`, json({ status }, 'PUT')),

  settings: () => request<AdminSettings>('/api/admin/settings'),
  saveSettings: (body: { maintenanceMode: boolean; maintenanceMessage: string; signupsEnabled: boolean }) =>
    request<AdminSettings>('/api/admin/settings', json(body, 'PUT')),
}
