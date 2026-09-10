import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { usePlan } from '../../lib/plan'
import { useToast } from '../ui/Toast'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  /** e.g. "3 / 3 documents" */
  usage: string
  /** e.g. "Upgrade to Pro to add up to 50 documents." */
  message: string
}

export default function UpgradeDialog({
  open,
  onClose,
  title,
  usage,
  message,
}: Props) {
  const navigate = useNavigate()
  const toast = useToast()
  const { changePlan } = usePlan()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const [used, total] = usage.split('/').map((s) => parseInt(s, 10))
  const pct = total ? Math.min(100, Math.round((used / total) * 100)) : 100

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn btn--ghost btn--sm modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <span className="modal__icon">
          <Sparkles />
        </span>

        <h3 id="upgrade-title">{title}</h3>

        <div className="modal__usage">
          <div className="modal__usage-row">
            <span>You've used</span>
            <strong className="mono">{usage.trim()}</strong>
          </div>
          <div className="score-bar">
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>

        <p>{message}</p>
        <p className="muted" style={{ fontSize: '0.78rem' }}>
          Upgrading here is a demo — no payment is processed.
        </p>

        <div className="modal__actions">
          <Button
            block
            onClick={() => {
              changePlan('pro')
              toast('ok', 'Pro plan activated (demo — no payment was processed).')
              onClose()
            }}
          >
            Upgrade to Pro
          </Button>
          <Button variant="ghost" block onClick={onClose}>
            Maybe Later
          </Button>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => navigate('/pricing')}
          >
            See full plan comparison
          </button>
        </div>
      </div>
    </div>
  )
}
