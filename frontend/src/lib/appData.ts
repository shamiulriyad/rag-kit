/* Extra mock data for the SaaS surfaces (search, notifications, activity, team,
   knowledge bases, conversations). Every shape here is deliberately close to
   what a REST payload would look like, so a real service can drop in later. */

import { mockDocuments } from './mockData'

export interface KnowledgeBase {
  id: string
  name: string
  description: string
  documents: number
  chunks: number
  updatedAt: string
}

export const mockKnowledgeBases: KnowledgeBase[] = [
  {
    id: 'kb_english',
    name: 'English Learning',
    description: 'Grammar references and study material for ESL learners.',
    documents: 2,
    chunks: 1401,
    updatedAt: '2026-09-11T09:40:00Z',
  },
  {
    id: 'kb_platform',
    name: 'Platform Docs',
    description: 'Internal architecture specs and engineering runbooks.',
    documents: 1,
    chunks: 214,
    updatedAt: '2026-09-10T15:12:00Z',
  },
  {
    id: 'kb_research',
    name: 'RAG Research',
    description: 'Papers and surveys on retrieval-augmented generation.',
    documents: 1,
    chunks: 133,
    updatedAt: '2026-09-08T18:02:00Z',
  },
]

export interface Conversation {
  id: string
  title: string
  knowledgeBase: string
  messages: number
  updatedAt: string
}

export const mockConversations: Conversation[] = [
  {
    id: 'cv_present_perfect',
    title: 'Present perfect vs past simple',
    knowledgeBase: 'English Learning',
    messages: 6,
    updatedAt: '2026-09-11T10:24:00Z',
  },
  {
    id: 'cv_frontend_python',
    title: 'How does the frontend reach the Python service?',
    knowledgeBase: 'Platform Docs',
    messages: 4,
    updatedAt: '2026-09-11T09:18:00Z',
  },
  {
    id: 'cv_chunk_overlap',
    title: 'Recommended chunk overlap for long documents',
    knowledgeBase: 'RAG Research',
    messages: 8,
    updatedAt: '2026-09-10T18:44:00Z',
  },
]

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

export const mockTeam = {
  name: 'RAG Starter Team',
  members: [
    {
      id: 'm_owner',
      name: 'You',
      email: 'manjurulhaque552@gmail.com',
      role: 'Owner' as const,
      status: 'active' as const,
      joinedAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'm_admin',
      name: 'Priya Nair',
      email: 'priya@ragstarter.dev',
      role: 'Admin' as const,
      status: 'active' as const,
      joinedAt: '2026-08-14T10:00:00Z',
    },
    {
      id: 'm_dev1',
      name: 'Tom Fletcher',
      email: 'tom@ragstarter.dev',
      role: 'Member' as const,
      status: 'active' as const,
      joinedAt: '2026-08-20T10:00:00Z',
    },
    {
      id: 'm_dev2',
      name: 'Sara Kim',
      email: 'sara@ragstarter.dev',
      role: 'Member' as const,
      status: 'pending' as const,
      joinedAt: '2026-09-09T10:00:00Z',
    },
  ] as TeamMember[],
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

const now = Date.now()
const ago = (mins: number) => new Date(now - mins * 60_000).toISOString()

export const seedNotifications: AppNotification[] = [
  {
    id: 'n1',
    type: 'doc_ready',
    title: 'Document processed',
    body: 'English-Grammar-In-Use.pdf finished indexing — 1,187 chunks.',
    createdAt: ago(8),
    read: false,
  },
  {
    id: 'n2',
    type: 'doc_failed',
    title: 'Processing failed',
    body: 'Scanned-Invoice-Batch-Q2.pdf appears to be image-based. OCR is required.',
    createdAt: ago(46),
    read: false,
  },
  {
    id: 'n3',
    type: 'usage_warning',
    title: 'Usage limit approaching',
    body: "You've used 74 of 100 monthly questions on the Free plan.",
    createdAt: ago(180),
    read: false,
  },
  {
    id: 'n4',
    type: 'kb_created',
    title: 'Knowledge Base created',
    body: '"RAG Research" was created with 1 document.',
    createdAt: ago(1440),
    read: true,
  },
  {
    id: 'n5',
    type: 'plan_reminder',
    title: 'Upgrade reminder',
    body: 'Pro unlocks 50 documents and 5,000 questions / month.',
    createdAt: ago(2880),
    read: true,
  },
  {
    id: 'n6',
    type: 'team_activity',
    title: 'New team activity',
    body: 'Priya Nair uploaded Platform-Architecture-Spec-v3.pdf.',
    createdAt: ago(4320),
    read: true,
  },
]

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

export const seedActivity: ActivityEntry[] = [
  { id: 'a1', type: 'upload', text: 'Uploaded English-Grammar-In-Use.pdf', at: ago(2) },
  {
    id: 'a2',
    type: 'conversation',
    text: 'Asked a question in English Learning',
    at: ago(15),
  },
  {
    id: 'a3',
    type: 'kb_created',
    text: 'Created the Programming Knowledge Base',
    at: ago(64),
  },
  { id: 'a4', type: 'settings', text: 'Changed Top-K retrieval to 5', at: ago(190) },
  {
    id: 'a5',
    type: 'prompt',
    text: 'Updated the system prompt in Prompt Playground',
    at: ago(300),
  },
  {
    id: 'a6',
    type: 'delete',
    text: 'Deleted Old-Draft-Notes.pdf',
    at: ago(1500),
  },
]

/** Flat, categorised index the command palette searches over. */
export interface SearchDoc {
  id: string
  category: 'Knowledge Bases' | 'Documents' | 'Conversations' | 'Sources'
  title: string
  subtitle: string
  to: string
}

export function buildSearchIndex(): SearchDoc[] {
  const kbs: SearchDoc[] = mockKnowledgeBases.map((k) => ({
    id: k.id,
    category: 'Knowledge Bases',
    title: k.name,
    subtitle: `${k.documents} docs · ${k.chunks.toLocaleString()} chunks`,
    to: '/dashboard',
  }))
  const docs: SearchDoc[] = mockDocuments.map((d) => ({
    id: d.id,
    category: 'Documents',
    title: d.name,
    subtitle: `${d.pages || '—'} pages · ${d.status}`,
    to: '/documents',
  }))
  const convos: SearchDoc[] = mockConversations.map((c) => ({
    id: c.id,
    category: 'Conversations',
    title: c.title,
    subtitle: `${c.knowledgeBase} · ${c.messages} messages`,
    to: '/chat',
  }))
  const sources: SearchDoc[] = mockSources.map((s) => ({
    id: s.id,
    category: 'Sources',
    title: `${s.document} — p.${s.page}`,
    subtitle: s.snippet,
    to: '/chat',
  }))
  return [...kbs, ...docs, ...convos, ...sources]
}
