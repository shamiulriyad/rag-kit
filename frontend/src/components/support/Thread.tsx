import { useState } from 'react'
import StatusBadge from '../admin/StatusBadge'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Field'
import type { TicketMessage, TicketStatus } from '../../services/supportApi'
import { relativeTime } from '../../lib/format'

const BADGE: Record<TicketStatus, { status: string; label: string }> = {
  open: { status: 'pending', label: 'Open' },
  answered: { status: 'queued', label: 'Answered' },
  closed: { status: 'unknown', label: 'Closed' },
}

export function TicketBadge({ status }: { status: TicketStatus }) {
  const b = BADGE[status] ?? BADGE.open
  return <StatusBadge status={b.status} label={b.label} />
}

/** A ticket conversation and its reply box. Message text is rendered as plain text only. */
export default function Thread({
  messages,
  onSend,
  disabled,
  placeholder,
  sendLabel = 'Send reply',
}: {
  messages: TicketMessage[]
  onSend: (body: string) => Promise<void>
  disabled?: boolean
  placeholder?: string
  sendLabel?: string
}) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    setBusy(true)
    setError(null)
    try {
      await onSend(body.trim())
      setBody('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ol className="thread">
        {messages.map((m) => (
          <li key={m.id} className={`thread__msg${m.isStaff ? ' thread__msg--staff' : ''}`}>
            <header>
              <strong>{m.author}</strong>
              <span>{relativeTime(m.createdAt)}</span>
            </header>
            <p>{m.body}</p>
          </li>
        ))}
      </ol>
      {!disabled && (
        <div className="thread__reply">
          <Textarea
            rows={4}
            value={body}
            maxLength={4000}
            placeholder={placeholder}
            aria-label="Reply"
            onChange={(e) => setBody(e.target.value)}
          />
          {error && (
            <span className="field__error" role="alert">
              {error}
            </span>
          )}
          <div>
            <Button onClick={send} loading={busy} disabled={!body.trim()}>
              {sendLabel}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
