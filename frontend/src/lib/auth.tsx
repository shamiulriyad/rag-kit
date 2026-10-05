/* Real authentication against the ASP.NET Core backend (Controllers/AuthController.cs).
   Access + refresh tokens and the current profile are persisted to localStorage so a
   page reload doesn't force a re-login; setAccessToken/setRefreshHandler wire this
   session into services/api.ts so every request carries it and a 401 gets one silent
   refresh-and-retry. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  ApiError,
  getMe,
  login as apiLogin,
  logout as apiLogout,
  refreshTokens as apiRefreshTokens,
  register as apiRegister,
  setAccessToken,
  setRefreshHandler,
  type AuthResponse,
  type UserProfile,
} from '../services/api'

interface Session {
  accessToken: string
  refreshToken: string
  user: UserProfile
}

interface AuthValue {
  user: UserProfile | null
  ready: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (fullName: string, email: string, password: string) => Promise<void>
  signOut: () => void
  /** Re-reads the profile from the API (e.g. after verifying the email). */
  refreshUser: () => Promise<void>
  /** Replaces the stored session, e.g. with the fresh tokens a password change returns. */
  adoptSession: (res: AuthResponse) => void
}

const STORAGE_KEY = 'rag-starter.auth.session'

const AuthContext = createContext<AuthValue | null>(null)

function readStored(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  const persist = useCallback((next: Session | null) => {
    setSession(next)
    setAccessToken(next?.accessToken ?? null)
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* private mode / storage disabled — session stays in memory only */
    }
  }, [])

  const persistAuthResponse = useCallback(
    (res: AuthResponse) =>
      persist({ accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user }),
    [persist],
  )

  // Registers with services/api.ts so a 401 anywhere triggers one silent
  // refresh-and-retry instead of immediately logging the user out.
  useEffect(() => {
    // Single flight: several requests can hit a 401 at once. Rotating the refresh token once per
    // request would replay an already-used token, which the server treats as theft and answers by
    // signing the account out everywhere. All concurrent callers share one refresh instead.
    let inflight: Promise<string | null> | null = null
    setRefreshHandler(() => {
      inflight ??= (async () => {
        const stored = readStored()
        if (!stored) return null
        try {
          const res = await apiRefreshTokens(stored.refreshToken)
          persistAuthResponse(res)
          return res.accessToken
        } catch {
          persist(null)
          return null
        }
      })().finally(() => {
        inflight = null
      })
      return inflight
    })
    return () => setRefreshHandler(null)
  }, [persist, persistAuthResponse])

  // On mount: rehydrate from storage, then re-validate against the backend so a
  // revoked/expired session (or one from a previous account) doesn't linger.
  useEffect(() => {
    const stored = readStored()
    if (!stored) {
      setReady(true)
      return
    }
    setSession(stored)
    setAccessToken(stored.accessToken)

    getMe()
      .then((user) => persist({ ...stored, user }))
      .catch(() => persist(null))
      .finally(() => setReady(true))
    // Runs once on mount — the refresh handler above covers token expiry after that.
  }, [])

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        persistAuthResponse(await apiLogin(email, password))
      } catch (err) {
        throw err instanceof ApiError ? new Error(err.message) : err
      }
    },
    [persistAuthResponse],
  )

  const signUp = useCallback(
    async (fullName: string, email: string, password: string) => {
      try {
        persistAuthResponse(await apiRegister(fullName, email, password))
      } catch (err) {
        throw err instanceof ApiError ? new Error(err.message) : err
      }
    },
    [persistAuthResponse],
  )

  const signOut = useCallback(() => {
    const current = session
    persist(null)
    if (current) apiLogout(current.refreshToken).catch(() => {})
  }, [session, persist])

  const refreshUser = useCallback(async () => {
    const stored = readStored()
    if (!stored) return
    const user = await getMe()
    persist({ ...stored, user })
  }, [persist])

  const value = useMemo<AuthValue>(
    () => ({
      user: session?.user ?? null,
      ready,
      signIn,
      signUp,
      signOut,
      refreshUser,
      adoptSession: persistAuthResponse,
    }),
    [session, ready, signIn, signUp, signOut, refreshUser, persistAuthResponse],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
