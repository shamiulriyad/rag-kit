import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Thread, { TicketBadge } from '../components/support/Thread'
import ConfirmDialog from '../components/admin/ConfirmDialog'
import { ErrorState, LoadingSkeleton } from '../components/admin/states'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { useAsync } from '../lib/adminHooks'
import { supportApi } from '../services/supportApi'

export default function SupportTicketPage() {
  const { id = '' } = useParams()
  const toast = useToast()
  const [closing, setClosing] = useState(false)
  const { data: t, error, reload } = useAsync(() => supportApi.get(id), [id])

  if (error && !t) return <ErrorState message={error} onRetry={reload} />
  if (!t) return <LoadingSkeleton lines={6} height={18} />

  return (
    <div className="page">
      <section className="acard">
        <div className="uhead">
          <div>
            <p className="muted" style={{ margin: 0 }}>
              <Link to="/support">← All tickets</Link>
            </p>
            <h2>{t.subject}</h2>
            <div className="uhead__meta">
              <TicketBadge status={t.status} />
            </div>
          </div>
          {t.status !== 'closed' && (
            <Button variant="secondary" onClick={() => setClosing(true)}>
              Close ticket
            </Button>
          )}
        </div>
      </section>

      <section className="acard">
        <Thread
          messages={t.messages}
          placeholder={t.status === 'closed' ? 'Replying will reopen this ticket.' : 'Write a reply…'}
          onSend={async (body) => {
            await supportApi.reply(t.id, body)
            toast('ok', 'Reply sent.')
            reload()
          }}
        />
      </section>

      <ConfirmDialog
        open={closing}
        title="Close this ticket?"
        description="You can reopen it later by replying."
        confirmLabel="Close ticket"
        onClose={() => setClosing(false)}
        onConfirm={async () => {
          await supportApi.close(t.id)
          toast('ok', 'Ticket closed.')
          reload()
        }}
      />
    </div>
  )
}
