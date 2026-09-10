import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { useLocalStorage } from './hooks'
import { seedNotifications, type AppNotification } from './appData'

interface NotificationsValue {
  items: AppNotification[]
  unread: number
  markRead: (id: string) => void
  markAllRead: () => void
  remove: (id: string) => void
  clearAll: () => void
  /** so other features can raise notifications later — a backend would push these */
  push: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void
}

const NotificationsContext = createContext<NotificationsValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useLocalStorage<AppNotification[]>(
    'rag-starter.notifications',
    seedNotifications,
  )

  const markRead = useCallback(
    (id: string) =>
      setItems((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n))),
    [setItems],
  )
  const markAllRead = useCallback(
    () => setItems((list) => list.map((n) => ({ ...n, read: true }))),
    [setItems],
  )
  const remove = useCallback(
    (id: string) => setItems((list) => list.filter((n) => n.id !== id)),
    [setItems],
  )
  const clearAll = useCallback(() => setItems([]), [setItems])
  const push = useCallback<NotificationsValue['push']>(
    (n) =>
      setItems((list) => [
        {
          ...n,
          id: `n_${Date.now()}`,
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...list,
      ]),
    [setItems],
  )

  const value = useMemo<NotificationsValue>(
    () => ({
      items,
      unread: items.filter((n) => !n.read).length,
      markRead,
      markAllRead,
      remove,
      clearAll,
      push,
    }),
    [items, markRead, markAllRead, remove, clearAll, push],
  )

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx)
    throw new Error('useNotifications must be used inside <NotificationsProvider>')
  return ctx
}
