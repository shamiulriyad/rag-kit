import { useState } from 'react'
import DataTable, { type Column } from '../../components/admin/DataTable'
import FilterBar from '../../components/admin/FilterBar'
import StatusBadge from '../../components/admin/StatusBadge'
import { useAsync } from '../../lib/adminHooks'
import { relativeTime } from '../../lib/format'
import { adminApi, type AdminInvitationItem } from '../../services/adminApi'

const PAGE_SIZE = 15

const COLUMNS: Column<AdminInvitationItem>[] = [
  { key: 'email', header: 'Invited email', render: (i) => <strong>{i.email}</strong> },
  { key: 'ws', header: 'Workspace', render: (i) => i.workspace },
  { key: 'role', header: 'Role', render: (i) => i.role },
  { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
  { key: 'created', header: 'Sent', wide: true, render: (i) => relativeTime(i.createdAt) },
]

export default function InvitationsPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const list = useAsync(() => adminApi.invitations({ status, page, pageSize: PAGE_SIZE }), [status, page])

  return (
    <div className="apage">
      <FilterBar
        onReset={() => {
          setStatus('')
          setPage(1)
        }}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: status,
            onChange: (v) => {
              setStatus(v)
              setPage(1)
            },
            options: [
              { value: '', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'active', label: 'Active' },
            ],
          },
        ]}
      />
      <DataTable
        columns={COLUMNS}
        rows={list.data?.items}
        rowKey={(i) => i.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        emptyTitle="No invitations"
        emptyHint="Workspace invitations and memberships appear here once a customer invites someone."
        page={page}
        pageSize={PAGE_SIZE}
        total={list.data?.total ?? 0}
        onPageChange={setPage}
      />
    </div>
  )
}
