/* Support tickets. `supportApi` is the signed-in customer's own tickets; the admin inbox is in adminApi. */

import { request } from './api'

export type TicketStatus = 'open' | 'answered' | 'closed'

export interface TicketMessage {
  id: string
  author: string
  isStaff: boolean
  body: string
  createdAt: string
}

export interface TicketItem {
  id: string
  subject: string
  status: TicketStatus
  createdAt: string
  updatedAt: string
  messages: number
}

export interface TicketDetail {
  id: string
  subject: string
  status: TicketStatus
  createdAt: string
  updatedAt: string
  messages: TicketMessage[]
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const supportApi = {
  list: () => request<TicketItem[]>('/api/support'),
  get: (id: string) => request<TicketDetail>(`/api/support/${id}`),
  create: (subject: string, message: string) => request<TicketDetail>('/api/support', json({ subject, message })),
  reply: (id: string, body: string) => request<TicketDetail>(`/api/support/${id}/messages`, json({ body })),
  close: (id: string) => request<void>(`/api/support/${id}/close`, { method: 'POST' }),
}
