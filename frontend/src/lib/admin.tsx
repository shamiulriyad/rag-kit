import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './auth'
import { adminApi } from '../services/adminApi'

/* Who the admin API says the caller is. This drives what the UI shows; the API independently
   enforces every action, so nothing here is a security boundary. */

interface AdminContextValue {
  /** null while the first check is in flight. */
  isAdmin: boolean | null
  permissions: string[]
  can: (permission: string) => boolean
}

const AdminContext = createContext<AdminContextValue | null>(null)

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [state, setState] = useState<{ isAdmin: boolean | null; permissions: string[] }>({
    isAdmin: null,
    permissions: [],
  })

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    adminApi
      .access()
      .then((r) => !cancelled && setState({ isAdmin: r.isAdmin, permissions: r.permissions }))
      .catch(() => !cancelled && setState({ isAdmin: false, permissions: [] }))
    return () => {
      cancelled = true
    }
  }, [userId])

  const value = useMemo<AdminContextValue>(
    () => ({
      isAdmin: userId ? state.isAdmin : false,
      permissions: state.permissions,
      can: (p) => state.permissions.includes(p),
    }),
    [state, userId],
  )

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>')
  return ctx
}
