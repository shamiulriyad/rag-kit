import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import StatusBadge from '../../components/admin/StatusBadge'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import PermissionGuard from '../../components/admin/PermissionGuard'
import MetricCard from '../../components/admin/MetricCard'
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/admin/states'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { useAsync } from '../../lib/adminHooks'
import { formatBytes, formatNumber, relativeTime } from '../../lib/format'
import { adminApi } from '../../services/adminApi'
import { TicketBadge } from '../../components/support/Thread'

function UserTickets({ userId }: { userId: string }) {
  const list = useAsync(() => adminApi.tickets({ userId, page: 1, pageSize: 20 }), [userId])
  if (list.error && !list.data) return <ErrorState message={list.error} onRetry={list.reload} />
  if (!list.data) return <LoadingSkeleton lines={3} />
  if (list.data.items.length === 0) return <EmptyState title="No support tickets" hint="This user has not contacted support." />
  return (
    <ul className="alist">
      {list.data.items.map((t) => (
        <li key={t.id}>
          <div>
            <Link to={`/admin/support/${t.id}`}>{t.subject}</Link>
            <span>Last activity {relativeTime(t.updatedAt)}</span>
          </div>
          <TicketBadge status={t.status} />
        </li>
      ))}
    </ul>
  )
}

const TABS = ['Workspaces', 'Usage', 'Activity', 'Security', 'Support'] as const
type Tab = (typeof TABS)[number]

export default function UserDetailPage() {
  const { id = '' } = useParams()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('Workspaces')
  const [dialog, setDialog] = useState<'suspend' | 'reactivate' | 'plan' | null>(null)
  const [plan, setPlan] = useState('')

  const { data: u, loading, error, reload } = useAsync(() => adminApi.user(id), [id])

  if (error && !u) return <ErrorState message={error} onRetry={reload} />
  if (!u) return <LoadingSkeleton lines={8} height={18} />

  const isAdminUser = u.role === 'Platform admin'
  const selectedPlan = plan || u.plan

  return (
    <div className="apage">
      <section className="acard">
        <div className="uhead">
          <div>
            <h2>{u.fullName}</h2>
            <p className="muted">{u.email}</p>
            <div className="uhead__meta">
              <StatusBadge status={u.status} />
              <span>{u.role}</span>
              <span>{u.plan} plan</span>
              <span>Registered {relativeTime(u.createdAt)}</span>
              <span>Last active {u.lastLoginAt ? relativeTime(u.lastLoginAt) : 'never'}</span>
            </div>
          </div>
          <PermissionGuard permission="users.manage">
            {!isAdminUser &&
              (u.status === 'suspended' ? (
                <Button onClick={() => setDialog('reactivate')}>Reactivate user</Button>
              ) : (
                <Button variant="danger" onClick={() => setDialog('suspend')}>
                  Suspend user
                </Button>
              ))}
          </PermissionGuard>
        </div>
      </section>

      <div className="atabs" role="tablist" aria-label="User sections">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'is-active' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Workspaces' && (
        <section className="acard" role="tabpanel">
          {u.workspaces.length === 0 ? (
            <EmptyState title="No workspaces" hint="This user does not own or belong to any workspace." />
          ) : (
            <ul className="alist">
              {u.workspaces.map((w) => (
                <li key={w.id}>
                  <div>
                    <Link to={`/admin/workspaces?search=${encodeURIComponent(w.name)}`}>{w.name}</Link>
                    <span>{w.role}</span>
                  </div>
                  <span className="muted">{w.members} members</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'Usage' && (
        <div role="tabpanel" className="apage">
          <div className="metrics">
            <MetricCard label="Knowledge bases" value={u.usage.knowledgeBases} />
            <MetricCard label="Documents" value={formatNumber(u.usage.documents)} />
            <MetricCard label="Chunks" value={formatNumber(u.usage.chunks)} />
            <MetricCard label="Storage" value={formatBytes(u.usage.storageBytes)} />
            <MetricCard label="Questions this month" value={formatNumber(u.usage.questionsThisMonth)} />
            <MetricCard label="Questions all time" value={formatNumber(u.usage.questionsTotal)} />
          </div>
          <PermissionGuard permission="users.manage">
            <section className="acard">
              <header className="acard__head">
                <h3>Plan</h3>
              </header>
              <div className="rowactions">
                <select className="select" value={selectedPlan} onChange={(e) => setPlan(e.target.value)} aria-label="Plan">
                  <option>Free</option>
                  <option>Pro</option>
                  <option>Team</option>
                </select>
                <Button variant="secondary" disabled={selectedPlan === u.plan} onClick={() => setDialog('plan')}>
                  Change plan
                </Button>
              </div>
              <p className="muted" style={{ fontSize: '0.78rem' }}>
                Sets the plan directly. No payment is taken - there is no payment provider connected.
              </p>
            </section>
          </PermissionGuard>
        </div>
      )}

      {tab === 'Activity' && (
        <section className="acard" role="tabpanel">
          {u.activity.length === 0 ? (
            <EmptyState title="No activity recorded" />
          ) : (
            <ul className="alist">
              {u.activity.map((a, i) => (
                <li key={i}>
                  <div>
                    <code>{a.action}</code>
                    <span>{a.entityType}</span>
                  </div>
                  <span className="muted nowrap">{relativeTime(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'Security' && (
        <section className="acard" role="tabpanel">
          <dl className="kvlist">
            <div>
              <dt>Account status</dt>
              <dd>
                <StatusBadge status={u.security.isSuspended ? 'suspended' : 'active'} />
              </dd>
            </div>
            <div>
              <dt>Open sessions</dt>
              <dd>{u.security.activeSessions}</dd>
            </div>
            <div>
              <dt>Last sign-in</dt>
              <dd>{u.security.lastLoginAt ? relativeTime(u.security.lastLoginAt) : 'Never'}</dd>
            </div>
            {u.security.isSuspended && (
              <>
                <div>
                  <dt>Suspended</dt>
                  <dd>{u.security.suspendedAt ? relativeTime(u.security.suspendedAt) : '—'}</dd>
                </div>
                <div>
                  <dt>Reason</dt>
                  <dd>{u.security.suspensionReason ?? '—'}</dd>
                </div>
              </>
            )}
          </dl>
        </section>
      )}

      {tab === 'Support' && (
        <section className="acard" role="tabpanel">
          <UserTickets userId={u.id} />
        </section>
      )}

      <ConfirmDialog
        open={dialog === 'suspend'}
        title={`Suspend ${u.email}?`}
        description="They will be signed out and unable to sign in until reactivated. Their data is kept. This is recorded in the audit log."
        confirmLabel="Suspend user"
        danger
        reasonLabel="Reason (required, saved to the audit log)"
        onClose={() => setDialog(null)}
        onConfirm={async (reason) => {
          await adminApi.suspendUser(u.id, reason)
          toast('ok', 'User suspended.')
          reload()
        }}
      />
      <ConfirmDialog
        open={dialog === 'reactivate'}
        title={`Reactivate ${u.email}?`}
        description="They will be able to sign in again."
        confirmLabel="Reactivate"
        onClose={() => setDialog(null)}
        onConfirm={async () => {
          await adminApi.reactivateUser(u.id)
          toast('ok', 'User reactivated.')
          reload()
        }}
      />
      <ConfirmDialog
        open={dialog === 'plan'}
        title={`Change plan to ${selectedPlan}?`}
        description="The user's limits change immediately. No payment is taken or refunded."
        confirmLabel="Change plan"
        onClose={() => setDialog(null)}
        onConfirm={async () => {
          await adminApi.setUserPlan(u.id, selectedPlan)
          toast('ok', `Plan changed to ${selectedPlan}.`)
          setPlan('')
          reload()
        }}
      />
      {loading && <span className="sr-only" role="status">Refreshing</span>}
    </div>
  )
}
