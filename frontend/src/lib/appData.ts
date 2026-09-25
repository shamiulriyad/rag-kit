/* Shared UI types (activity, notifications, search). Real data comes from services/api.ts. */

export const DEFAULT_TAGS = ['Research', 'Education', 'Programming', 'Important']

export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'Owner' | 'Admin' | 'Member'
  status: 'active' | 'pending'
  joinedAt: string
}

export type NotificationType =
  | 'doc_ready'
  | 'doc_failed'
  | 'kb_created'
  | 'usage_warning'
  | 'plan_reminder'
  | 'team_activity'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  createdAt: string
  read: boolean
}

export type ActivityType =
  | 'upload'
  | 'kb_created'
  | 'conversation'
  | 'delete'
  | 'settings'
  | 'prompt'

export interface ActivityEntry {
  id: string
  type: ActivityType
  text: string
  at: string
}

/** Flat, categorised index the command palette searches over. */
export interface SearchDoc {
  id: string
  category: 'Knowledge Bases' | 'Documents' | 'Conversations' | 'Sources'
  title: string
  subtitle: string
  to: string
}
