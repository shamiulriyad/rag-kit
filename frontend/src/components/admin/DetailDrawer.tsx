import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { useDialogFocus } from '../../lib/adminHooks'

/** Side panel for "more about this row" without leaving the table. */
export default function DetailDrawer({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useDialogFocus(open, onClose)
  if (!open) return null

  return (
    <div className="drawer-scrim" onMouseDown={onClose}>
      <aside
        ref={ref}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="drawer__head">
          <div>
            <h3 id="drawer-title">{title}</h3>
            {subtitle && <span>{subtitle}</span>}
          </div>
          <button className="btn btn--ghost btn--sm" onClick={onClose} aria-label="Close panel">
            <X size={16} />
          </button>
        </header>
        <div className="drawer__body">{children}</div>
      </aside>
    </div>
  )
}
