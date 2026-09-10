/* Mock authentication. Frontend-only, backed by localStorage.
   No JWT, no Identity, no backend session — this exists purely so the app
   can present a real SaaS auth experience while the brief keeps auth mocked. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export interface MockUser {
  name: string
  email: string
}

interface AuthValue {
  user: MockUser | null
  ready: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signOut: () => void
}

const STORAGE_KEY = 'rag-starter.auth.user'

const AuthContext = createContext<AuthValue | null>(null)

function readStored(): MockUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as MockUser) : null
  } catch {
    return null
  }
}

// Small artificial delay so buttons get to show their loading state.
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setUser(readStored())
    setReady(true)
  }, [])

  const persist = useCallback((next: MockUser | null) => {
    setUser(next)
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* private mode / storage disabled — session stays in memory only */
    }
  }, [])

  const signIn = useCallback(
    async (email: string, password: string) => {
      await wait(600)
      if (!email.includes('@') || password.length < 6) {
        throw new Error('Enter a valid email and a password of at least 6 characters.')
      }
      const name = email.split('@')[0].replace(/[._-]+/g, ' ')
      persist({ email, name: name.replace(/\b\w/g, (c) => c.toUpperCase()) })
    },
    [persist],
  )

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      await wait(700)
      if (name.trim().length < 2) throw new Error('Please enter your name.')
      if (!email.includes('@')) throw new Error('Enter a valid email address.')
      if (password.length < 6)
        throw new Error('Password must be at least 6 characters.')
      persist({ name: name.trim(), email })
    },
    [persist],
  )

  const signOut = useCallback(() => persist(null), [persist])

  const value = useMemo<AuthValue>(
    () => ({ user, ready, signIn, signUp, signOut }),
    [user, ready, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
