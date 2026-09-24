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
import { useLocalStorage } from './hooks'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationDto,
} from '../services/api'
import type { AppNotification, NotificationType } from './appData'

interface NotificationsValue {
  items: AppNotification[]
  unread: number
  markRead: (id: string) => void
  markAllRead: () => void
  remove: (id: string) => void
  clearAll: () => void
  /** The backend creates the real notification (e.g. "document indexed"); calling this
   *  just pulls the latest list so it appears right away. */
  push: (n?: unknown) => void
}

const NotificationsContext = createContext<NotificationsValue | null>(null)

const TYPE_MAP: Record<string, NotificationType> = {
  DocReady: 'doc_ready',
  DocFailed: 'doc_failed',
  KbCreated: 'kb_created',
  UsageWarning: 'usage_warning',
  PlanReminder: 'plan_reminder',
  TeamActivity: 'team_activity',
}

const toItem = (n: NotificationDto): AppNotification => ({
  id: n.id,
  type: TYPE_MAP[n.type] ?? 'team_activity',
  title: n.title,
  body: n.message,
  createdAt: n.createdAt,
  read: n.isRead,
})

const POLL_MS = 20_000

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [items, setItems] = useState<AppNotification[]>([])
  const [tick, setTick] = useState(0)
  // The API has no delete endpoint, so dismissed notifications are hidden locally.
  const [dismissed, setDismissed] = useLocalStorage<string[]>('rag-starter.notifications.dismissed', [])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const load = () =>
      listNotifications()
        .then((rows) => !cancelled && setItems(rows.map(toItem)))
        .catch(() => {})
    load()
    const timer = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [userId, tick])

  const visible = useMemo(
    () => (userId ? items.filter((n) => !dismissed.includes(n.id)) : []),
    [items, dismissed, userId],
  )

  const markRead = useCallback((id: string) => {
    setItems((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)))
    markNotificationRead(id).catch(() => {})
  }, [])

  const markAllRead = useCallback(() => {
    setItems((list) => list.map((n) => ({ ...n, read: true })))
    markAllNotificationsRead().catch(() => {})
  }, [])

  const remove = useCallback(
    (id: string) => setDismissed((d) => (d.includes(id) ? d : [...d, id])),
    [setDismissed],
  )

  const clearAll = useCallback(() => {
    setDismissed((d) => [...new Set([...d, ...items.map((n) => n.id)])])
    markAllNotificationsRead().catch(() => {})
  }, [items, setDismissed])

  const push = useCallback(() => setTick((t) => t + 1), [])

  const value = useMemo<NotificationsValue>(
    () => ({
      items: visible,
      unread: visible.filter((n) => !n.read).length,
      markRead,
      markAllRead,
      remove,
      clearAll,
      push,
    }),
    [visible, markRead, markAllRead, remove, clearAll, push],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>')
  return ctx
}
