import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { useLocalStorage } from './hooks'
import { seedActivity, type ActivityEntry, type ActivityType } from './appData'

interface ActivityValue {
  entries: ActivityEntry[]
  log: (type: ActivityType, text: string) => void
  clear: () => void
}

const ActivityContext = createContext<ActivityValue | null>(null)

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useLocalStorage<ActivityEntry[]>(
    'rag-starter.activity',
    seedActivity,
  )

  const log = useCallback(
    (type: ActivityType, text: string) =>
      setEntries((list) => [
        { id: `act_${Date.now()}`, type, text, at: new Date().toISOString() },
        ...list,
      ].slice(0, 100)),
    [setEntries],
  )

  const clear = useCallback(() => setEntries([]), [setEntries])

  const value = useMemo<ActivityValue>(
    () => ({ entries, log, clear }),
    [entries, log, clear],
  )
  return (
    <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>
  )
}

export function useActivity() {
  const ctx = useContext(ActivityContext)
  if (!ctx) throw new Error('useActivity must be used inside <ActivityProvider>')
  return ctx
}
