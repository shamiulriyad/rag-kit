import { useState } from 'react'
import DataTable, { type Column } from '../../components/admin/DataTable'
import StatusBadge from '../../components/admin/StatusBadge'
import { useAsync } from '../../lib/adminHooks'
import { relativeTime } from '../../lib/format'
import { adminApi, type AdminSubscriptionItem } from '../../services/adminApi'

const PAGE_SIZE = 15

const COLUMNS: Column<AdminSubscriptionItem>[] = [
  { key: 'u', header: 'User', render: (s) => <strong>{s.userEmail}</strong> },
  { key: 'p', header: 'Plan', render: (s) => s.plan },
  { key: 's', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
  { key: 'src', header: 'Source', render: (s) => (s.isMock ? 'Simulated checkout' : 'Payment provider') },
  { key: 'st', header: 'Started', wide: true, render: (s) => relativeTime(s.startedAt) },
  { key: 'e', header: 'Period ends', wide: true, render: (s) => (s.currentPeriodEnd ? relativeTime(s.currentPeriodEnd) : '—') },
]

export default function SubscriptionsPage() {
  const [page, setPage] = useState(1)
  const list = useAsync(() => adminApi.subscriptions({ page, pageSize: PAGE_SIZE }), [page])
  return (
    <div className="apage">
      <DataTable
        columns={COLUMNS}
        rows={list.data?.items}
        rowKey={(s) => s.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        emptyTitle="No subscriptions"
        emptyHint="Subscriptions appear once a customer upgrades."
        page={page}
        pageSize={PAGE_SIZE}
        total={list.data?.total ?? 0}
        onPageChange={setPage}
      />
      <p className="muted" style={{ fontSize: '0.78rem' }}>
        Payment processing is simulated, so these rows are not verified billing data.
      </p>
    </div>
  )
}
