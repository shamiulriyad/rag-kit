import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import { useLocalStorage } from './hooks'

export type ThemePref = 'dark' | 'light' | 'system'

interface ThemeValue {
  pref: ThemePref
  setPref: (p: ThemePref) => void
  /** the actually-applied theme after resolving "system" */
  resolved: 'dark' | 'light'
}

const ThemeContext = createContext<ThemeValue | null>(null)

function systemTheme(): 'dark' | 'light' {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPref] = useLocalStorage<ThemePref>('rag-starter.theme', 'dark')

  const resolved = pref === 'system' ? systemTheme() : pref

  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const next = pref === 'system' ? systemTheme() : pref
      root.dataset.theme = next
      root.style.colorScheme = next
    }
    apply()
    if (pref !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [pref])

  const value = useMemo(
    () => ({ pref, setPref, resolved }),
    [pref, setPref, resolved],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
