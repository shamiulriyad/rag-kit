import { useState } from 'react'
import DataTable, { type Column } from '../../components/admin/DataTable'
import StatusBadge from '../../components/admin/StatusBadge'
import { useAsync } from '../../lib/adminHooks'
import { relativeTime } from '../../lib/format'
import { adminApi, type AdminBillingEvent } from '../../services/adminApi'

const PAGE_SIZE = 15

const TYPE: Record<string, { status: string; label: string }> = {
  'subscription.started': { status: 'active', label: 'Subscription started' },
  'subscription.trial': { status: 'queued', label: 'Trial started' },
  'subscription.past_due': { status: 'pending', label: 'Past due' },
  'subscription.canceled': { status: 'failed', label: 'Canceled' },
  'subscription.expired': { status: 'failed', label: 'Expired' },
}

const COLUMNS: Column<AdminBillingEvent>[] = [
  { key: 'at', header: 'Time', render: (e) => <span className="nowrap">{new Date(e.at).toLocaleString()}</span> },
  {
    key: 'type',
    header: 'Event',
    render: (e) => {
      const t = TYPE[e.type]
      return t ? <StatusBadge status={t.status} label={t.label} /> : e.type
    },
  },
  { key: 'user', header: 'User', render: (e) => <strong>{e.userEmail}</strong> },
  { key: 'plan', header: 'Plan', render: (e) => e.plan },
  { key: 'price', header: 'List price', align: 'right', wide: true, render: (e) => `$${e.monthlyPrice}/mo` },
  { key: 'src', header: 'Source', render: (e) => (e.source === 'simulated' ? 'Simulated checkout' : 'Payment provider') },
  { key: 'ago', header: 'When', wide: true, render: (e) => relativeTime(e.at) },
]

export default function BillingEventsPage() {
  const [page, setPage] = useState(1)
  const list = useAsync(() => adminApi.billingEvents({ page, pageSize: PAGE_SIZE }), [page])
  return (
    <div className="apage">
      <DataTable
        columns={COLUMNS}
        rows={list.data?.items}
        rowKey={(e) => e.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        emptyTitle="No billing events"
        emptyHint="Subscription changes appear here once a customer upgrades."
        page={page}
        pageSize={PAGE_SIZE}
        total={list.data?.total ?? 0}
        onPageChange={setPage}
      />
      <p className="muted" style={{ fontSize: '0.78rem' }}>
        These are subscription state changes only. No payment provider is connected, so there are no charges, invoices
        or refunds, and the list price is not money received.
      </p>
    </div>
  )
}
