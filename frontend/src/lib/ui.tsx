import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'

interface UIValue {
  searchOpen: boolean
  setSearchOpen: (v: boolean) => void
  shortcutsOpen: boolean
  setShortcutsOpen: (v: boolean) => void
}

const UIContext = createContext<UIValue | null>(null)

function isTypingTarget(el: EventTarget | null) {
  const node = el as HTMLElement | null
  if (!node) return false
  const tag = node.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    node.isContentEditable
  )
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey

      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
        return
      }
      if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        navigate('/chat')
        return
      }
      if (mod && e.key.toLowerCase() === 'u') {
        e.preventDefault()
        navigate('/documents')
        return
      }
      if (e.key === '?' && !isTypingTarget(e.target)) {
        e.preventDefault()
        setShortcutsOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const value = useMemo<UIValue>(
    () => ({ searchOpen, setSearchOpen, shortcutsOpen, setShortcutsOpen }),
    [searchOpen, shortcutsOpen],
  )
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used inside <UIProvider>')
  return ctx
}
