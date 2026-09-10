import { useEffect } from 'react'
import { Users, X, Check } from 'lucide-react'
import { Button } from '../ui/Button'

const HIGHLIGHTS = [
  '200 Documents',
  '500K Chunks',
  '25K Questions / month',
  '50 Knowledge Bases',
  'Team Workspace',
  'Collaboration',
]

export default function TeamUpgradeModal({
  open,
  onClose,
  onContinue,
}: {
  open: boolean
  onClose: () => void
  onContinue: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn btn--ghost btn--sm modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <span className="modal__icon modal__icon--team">
          <Users />
        </span>

        <h3 id="team-modal-title">Build together with Team</h3>
        <p>Unlock more capacity and collaboration features for your team.</p>

        <ul className="modal__grid">
          {HIGHLIGHTS.map((h) => (
            <li key={h}>
              <Check size={15} />
              {h}
            </li>
          ))}
        </ul>

        <p className="muted" style={{ fontSize: '0.78rem' }}>
          This is a frontend demo — no payment, billing or team backend is involved.
        </p>

        <div className="modal__actions">
          <Button block onClick={onContinue}>
            Continue to Team
          </Button>
          <Button variant="ghost" block onClick={onClose}>
            Maybe Later
          </Button>
        </div>
      </div>
    </div>
  )
}
