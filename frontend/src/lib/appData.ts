/* Shared UI types (activity, notifications, search) plus the sample sources used only by
   the Playground preview. Real data comes from services/api.ts. */

export interface SourceRef {
  id: string
  document: string
  page: number
  snippet: string
}

export const mockSources: SourceRef[] = [
  {
    id: 'src_1',
    document: 'English-Grammar-In-Use.pdf',
    page: 132,
    snippet: 'The present perfect connects a past action to the present moment…',
  },
  {
    id: 'src_2',
    document: 'English-Grammar-In-Use.pdf',
    page: 141,
    snippet: 'Use the past simple when the time is specified: "I read it yesterday."',
  },
  {
    id: 'src_3',
    document: 'Platform-Architecture-Spec-v3.pdf',
    page: 12,
    snippet: 'React communicates only with the ASP.NET Core API, never with Python…',
  },
  {
    id: 'src_4',
    document: 'Retrieval-Augmented-Generation-Survey.pdf',
    page: 7,
    snippet: 'A chunk overlap of 10–20% preserves context across boundaries…',
  },
]

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
