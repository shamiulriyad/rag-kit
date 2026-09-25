import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

/** One number, its label, and (optionally) the caveat that keeps it honest. `to` makes the
 *  whole card a link to where the number comes from. */
export default function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  to,
  loading,
  tone,
}: {
  label: string
  value: ReactNode
  hint?: string | null
  icon?: LucideIcon
  to?: string
  loading?: boolean
  tone?: 'danger' | 'warning'
}) {
  const body = (
    <>
      <div className="metric__top">
        <span className="metric__label">{label}</span>
        {Icon && <Icon size={16} aria-hidden />}
      </div>
      <div className="metric__value">{loading ? <span className="metric__skeleton" aria-label="Loading" /> : value}</div>
      {hint && <div className="metric__hint">{hint}</div>}
    </>
  )
  const cls = `metric${tone ? ` metric--${tone}` : ''}`
  return to ? (
    <Link to={to} className={`${cls} metric--link`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}
