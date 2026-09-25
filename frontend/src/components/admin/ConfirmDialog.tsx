import { useState } from 'react'
import { Button } from '../ui/Button'
import { useDialogFocus } from '../../lib/adminHooks'

/** Confirmation before anything destructive or hard to undo. `onConfirm` may throw: the
 *  message is shown inside the dialog and the dialog stays open, so a failed action is never
 *  reported as done. With `reasonLabel` the admin must type a reason (it goes to the audit log). */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  danger = false,
  reasonLabel,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  danger?: boolean
  reasonLabel?: string
  onConfirm: (reason: string) => Promise<void>
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useDialogFocus(open, () => !busy && close())

  function close() {
    setReason('')
    setError(null)
    onClose()
  }

  if (!open) return null

  const needsReason = Boolean(reasonLabel)
  const invalid = needsReason && reason.trim().length < 3

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await onConfirm(reason.trim())
      setReason('')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The action failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-scrim" onMouseDown={() => !busy && close()}>
      <div
        ref={ref}
        className="modal adialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-title">{title}</h3>
        <p id="confirm-desc">{description}</p>

        {needsReason && (
          <div className="field">
            <label className="field__label" htmlFor="confirm-reason">
              {reasonLabel}
            </label>
            <textarea
              id="confirm-reason"
              className="textarea"
              rows={3}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        {error && (
          <div className="field__error" role="alert">
            {error}
          </div>
        )}

        <div className="adialog__actions">
          <Button variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={submit} loading={busy} disabled={invalid}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
