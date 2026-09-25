import type { ReactNode } from 'react'
import { useAdmin } from '../../lib/admin'
import { PermissionDenied } from './states'

/** Shows `children` only if the API told us the admin holds `permission`. This decides what is
 *  visible - the endpoint behind any control still rejects a caller who lacks the permission.
 *  `page` swaps a hidden section for a permission-denied state instead of nothing. */
export default function PermissionGuard({
  permission,
  page = false,
  fallback = null,
  children,
}: {
  permission: string
  page?: boolean
  fallback?: ReactNode
  children: ReactNode
}) {
  const { can } = useAdmin()
  if (can(permission)) return <>{children}</>
  return page ? <PermissionDenied permission={permission} /> : <>{fallback}</>
}
