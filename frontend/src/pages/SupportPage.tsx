import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LifeBuoy } from 'lucide-react'
import { TicketBadge } from '../components/support/Thread'
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/admin/states'
import { Button } from '../components/ui/Button'
import { Field, Input, Textarea } from '../components/ui/Field'
import { useToast } from '../components/ui/Toast'
import { useAsync } from '../lib/adminHooks'
import { relativeTime } from '../lib/format'
import { supportApi } from '../services/supportApi'

export default function SupportPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const list = useAsync(() => supportApi.list(), [])
  const [creating, setCreating] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const t = await supportApi.create(subject.trim(), message.trim())
      toast('ok', 'Ticket sent. We will reply here.')
      navigate(`/support/${t.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your request.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <p className="muted" style={{ fontSize: '0.86rem' }}>
          Ask the team a question or report a problem. Replies appear on the ticket.
        </p>
        {!creating && <Button onClick={() => setCreating(true)}>New ticket</Button>}
      </div>

      {creating && (
        <form className="acard cms-form" onSubmit={submit}>
          <Field label="Subject">
            {(id) => <Input id={id} value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} required />}
          </Field>
          <Field label="How can we help?" hint="Plain text. Include what you expected and what happened.">
            {(id) => (
              <Textarea id={id} rows={6} value={message} maxLength={4000} onChange={(e) => setMessage(e.target.value)} required />
            )}
          </Field>
          {error && (
            <span className="field__error" role="alert">
              {error}
            </span>
          )}
          <div className="rowactions">
            <Button type="submit" loading={busy} disabled={!subject.trim() || !message.trim()}>
              Send ticket
            </Button>
            <Button type="button" variant="ghost" onClick={() => setCreating(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {list.error && !list.data ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <LoadingSkeleton lines={4} height={18} />
      ) : list.data.length === 0 ? (
        <section className="acard">
          <EmptyState icon={<LifeBuoy />} title="No tickets yet" hint="When you contact support, your conversations are listed here." />
        </section>
      ) : (
        <section className="acard">
          <ul className="alist">
            {list.data.map((t) => (
              <li key={t.id} className="alist__link" onClick={() => navigate(`/support/${t.id}`)}>
                <div>
                  <strong>{t.subject}</strong>
                  <span>
                    {t.messages} message{t.messages === 1 ? '' : 's'} · updated {relativeTime(t.updatedAt)}
                  </span>
                </div>
                <TicketBadge status={t.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
