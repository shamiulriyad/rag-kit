import type { LucideIcon } from 'lucide-react'

export default function StatCard({
  icon: Icon,
  value,
  label,
  delta,
}: {
  icon: LucideIcon
  value: string
  label: string
  delta?: { text: string; trend: 'up' | 'flat' }
}) {
  return (
    <article className="card stat">
      <div className="stat__top">
        <span className="stat__icon">
          <Icon />
        </span>
        {delta && (
          <span className={`stat__delta stat__delta--${delta.trend}`}>{delta.text}</span>
        )}
      </div>
      <div>
        <div className="stat__value">{value}</div>
        <div className="stat__label">{label}</div>
      </div>
    </article>
  )
}
