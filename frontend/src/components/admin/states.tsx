import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, Lock } from 'lucide-react'
import { Button } from '../ui/Button'

/** Nothing to show. `hint` says why, so an empty table is never a blank mystery. */
export function EmptyState({
  title,
  hint,
  action,
  icon,
}: {
  title: string
  hint?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="astate">
      <span className="astate__icon">{icon ?? <Inbox />}</span>
      <strong>{title}</strong>
      {hint && <p>{hint}</p>}
      {action}
    </div>
  )
}

/** A request failed. Shows the server's message and offers a retry - never a fake empty state. */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="astate astate--error" role="alert">
      <span className="astate__icon">
        <AlertTriangle />
      </span>
      <strong>Could not load this data</strong>
      <p>{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function PermissionDenied({ permission }: { permission?: string }) {
  return (
    <div className="astate">
      <span className="astate__icon">
        <Lock />
      </span>
      <strong>You do not have access to this</strong>
      <p>
        Your admin role does not include {permission ? <code>{permission}</code> : 'this permission'}.
        Ask a platform owner if you need it.
      </p>
    </div>
  )
}

/** Placeholder blocks while data loads. Purely visual - real content replaces it. */
export function LoadingSkeleton({
  lines = 3,
  height = 14,
}: {
  lines?: number
  height?: number
}) {
  return (
    <div className="askeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} style={{ height, width: `${100 - (i % 3) * 14}%` }} />
      ))}
    </div>
  )
}
