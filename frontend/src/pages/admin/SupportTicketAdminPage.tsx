import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Thread, { TicketBadge } from '../../components/support/Thread'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import PermissionGuard from '../../components/admin/PermissionGuard'
import { ErrorState, LoadingSkeleton } from '../../components/admin/states'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { useAdmin } from '../../lib/admin'
import { useAsync } from '../../lib/adminHooks'
import { adminApi } from '../../services/adminApi'

export default function SupportTicketAdminPage() {
  const { id = '' } = useParams()
  const toast = useToast()
  const { can } = useAdmin()
  const [closing, setClosing] = useState(false)
  const { data: t, error, reload } = useAsync(() => adminApi.ticket(id), [id])

  if (error && !t) return <ErrorState message={error} onRetry={reload} />
  if (!t) return <LoadingSkeleton lines={6} height={18} />

  return (
    <div className="apage">
      <section className="acard">
        <div className="uhead">
          <div>
            <h2>{t.subject}</h2>
            <div className="uhead__meta">
              <TicketBadge status={t.status} />
              <span>
                <Link to={`/admin/users/${t.userId}`}>{t.userEmail}</Link>
              </span>
              <span>{t.userPlan} plan</span>
            </div>
          </div>
          <PermissionGuard permission="support.manage">
            <div className="rowactions">
              {t.status === 'closed' ? (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await adminApi.setTicketStatus(t.id, 'open')
                    toast('ok', 'Ticket reopened.')
                    reload()
                  }}
                >
                  Reopen
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setClosing(true)}>
                  Close ticket
                </Button>
              )}
            </div>
          </PermissionGuard>
        </div>
      </section>

      <section className="acard">
        <Thread
          messages={t.messages}
          disabled={!can('support.manage')}
          placeholder="Reply to the customer…"
          onSend={async (body) => {
            await adminApi.replyTicket(t.id, body)
            toast('ok', 'Reply sent.')
            reload()
          }}
        />
      </section>

      <ConfirmDialog
        open={closing}
        title="Close this ticket?"
        description="The customer can reopen it by replying. This is recorded in the audit log."
        confirmLabel="Close ticket"
        onClose={() => setClosing(false)}
        onConfirm={async () => {
          await adminApi.setTicketStatus(t.id, 'closed')
          toast('ok', 'Ticket closed.')
          reload()
        }}
      />
    </div>
  )
}
