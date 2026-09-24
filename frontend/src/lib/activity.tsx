import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './auth'
import { clearActivity, listActivity, type ActivityLogDto } from '../services/api'
import type { ActivityEntry, ActivityType } from './appData'

interface ActivityValue {
  entries: ActivityEntry[]
  /** Kept so pages can say "something happened" - the backend already records the real
   *  event, so this just refreshes the list from the server. */
  log: (type?: ActivityType, text?: string) => void
  clear: () => void
}

const ActivityContext = createContext<ActivityValue | null>(null)

const TYPE_BY_ACTION: Record<string, ActivityType> = {
  DOCUMENT_UPLOADED: 'upload',
  DOCUMENT_PROCESSED: 'upload',
  DOCUMENT_FAILED: 'upload',
  DOCUMENT_DELETED: 'delete',
  KNOWLEDGE_BASE_CREATED: 'kb_created',
  KNOWLEDGE_BASE_DELETED: 'delete',
  CHAT_STARTED: 'conversation',
  QUESTION_ASKED: 'conversation',
  SETTINGS_UPDATED: 'settings',
}

function meta(raw: string | null): Record<string, unknown> {
  try {
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function describe(a: ActivityLogDto): string {
  const m = meta(a.metadata)
  const file = (m.FileName ?? m.fileName) as string | undefined
  switch (a.action) {
    case 'DOCUMENT_UPLOADED':
      return `Uploaded ${file ?? 'a document'}`
    case 'DOCUMENT_PROCESSED':
      return 'A document finished indexing'
    case 'DOCUMENT_FAILED':
      return `Indexing failed${file ? ` for ${file}` : ''}`
    case 'DOCUMENT_DELETED':
      return `Deleted ${file ?? 'a document'}`
    case 'KNOWLEDGE_BASE_CREATED':
      return 'Created a Knowledge Base'
    case 'KNOWLEDGE_BASE_DELETED':
      return 'Deleted a Knowledge Base'
    case 'CHAT_STARTED':
      return 'Started a conversation'
    case 'QUESTION_ASKED':
      return 'Asked a question'
    case 'SETTINGS_UPDATED':
      return 'Updated settings'
    case 'USER_REGISTERED':
      return 'Created your account'
    case 'LOGIN':
      return 'Signed in'
    default:
      return a.action.toLowerCase().replace(/_/g, ' ')
  }
}

const toEntry = (a: ActivityLogDto): ActivityEntry => ({
  id: a.id,
  type: TYPE_BY_ACTION[a.action] ?? 'settings',
  text: describe(a),
  at: a.createdAt,
})

export function ActivityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    listActivity(100)
      .then((rows) => !cancelled && setEntries(rows.map(toEntry)))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [userId, tick])

  const log = useCallback(() => setTick((t) => t + 1), [])

  const clear = useCallback(() => {
    setEntries([])
    clearActivity().catch(() => setTick((t) => t + 1))
  }, [])

  const value = useMemo<ActivityValue>(
    () => ({ entries: userId ? entries : [], log, clear }),
    [entries, userId, log, clear],
  )
  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>
}

export function useActivity() {
  const ctx = useContext(ActivityContext)
  if (!ctx) throw new Error('useActivity must be used inside <ActivityProvider>')
  return ctx
}
