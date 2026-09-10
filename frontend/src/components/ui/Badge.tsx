import type { ReactNode } from 'react'

export default function Badge({
  children,
  tone = 'default',
  dot = false,
}: {
  children: ReactNode
  tone?: 'default' | 'primary' | 'accent'
  dot?: boolean
}) {
  return (
    <span className={`badge${tone !== 'default' ? ` badge--${tone}` : ''}`}>
      {dot && <span className="badge__dot" aria-hidden />}
      {children}
    </span>
  )
}
