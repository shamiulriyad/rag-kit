import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { AdminProvider, useAdmin } from '../../lib/admin'
import { adminApi } from '../../services/adminApi'

/** Whether to show the "Admin Panel" link in the customer app. The API decides who is an admin. */
export function useIsAdmin(): boolean | null {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    adminApi
      .access()
      .then((r) => !cancelled && setIsAdmin(r.isAdmin))
      .catch(() => !cancelled && setIsAdmin(false))
    return () => {
      cancelled = true
    }
  }, [userId])

  return userId ? isAdmin : false
}

function Gate({ children }: { children: ReactNode }) {
  const { isAdmin } = useAdmin()
  if (isAdmin === null) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <span className="spinner" />
      </div>
    )
  }
  return isAdmin ? <>{children}</> : <Navigate to="/dashboard" replace />
}

/** Route protection for /admin/*: non-admins are sent back to the customer app. This is only
 *  navigation - every admin API call is authorised again on the server. */
export default function AdminRoute({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <Gate>{children}</Gate>
    </AdminProvider>
  )
}
