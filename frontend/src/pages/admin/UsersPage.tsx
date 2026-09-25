import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable, { type Column } from '../../components/admin/DataTable'
import FilterBar from '../../components/admin/FilterBar'
import StatusBadge from '../../components/admin/StatusBadge'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import PermissionGuard from '../../components/admin/PermissionGuard'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { useAsync } from '../../lib/adminHooks'
import { useTableQuery } from '../../lib/adminQuery'
import { relativeTime } from '../../lib/format'
import { adminApi, type AdminUserItem } from '../../services/adminApi'

const PAGE_SIZE = 15

export default function UsersPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const q = useTableQuery(['status', 'plan'])
  const [target, setTarget] = useState<{ user: AdminUserItem; action: 'suspend' | 'reactivate' } | null>(null)

  const list = useAsync(
    () =>
      adminApi.users({
        search: q.searchQuery,
        status: q.filters.status,
        plan: q.filters.plan,
        page: q.page,
        pageSize: PAGE_SIZE,
      }),
    [q.searchQuery, q.filters.status, q.filters.plan, q.page],
  )

  const columns: Column<AdminUserItem>[] = [
    { key: 'user', header: 'User', render: (u) => <strong>{u.fullName}</strong> },
    { key: 'email', header: 'Email', render: (u) => u.email },
    { key: 'role', header: 'Role', wide: true, render: (u) => u.role },
    { key: 'plan', header: 'Plan', render: (u) => u.plan },
    { key: 'ws', header: 'Workspaces', align: 'right', wide: true, render: (u) => u.workspaces },
    { key: 'status', header: 'Status', render: (u) => <StatusBadge status={u.status} /> },
    { key: 'last', header: 'Last active', wide: true, render: (u) => (u.lastLoginAt ? relativeTime(u.lastLoginAt) : 'Never') },
    { key: 'reg', header: 'Registered', wide: true, render: (u) => relativeTime(u.createdAt) },
    {
      key: 'actions',
      header: 'Actions',
      render: (u) => (
        <div className="rowactions" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/users/${u.id}`)}>
            View
          </Button>
          <PermissionGuard permission="users.manage">
            {u.role === 'Platform admin' ? null : u.status === 'suspended' ? (
              <Button variant="secondary" size="sm" onClick={() => setTarget({ user: u, action: 'reactivate' })}>
                Reactivate
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setTarget({ user: u, action: 'suspend' })}>
                Suspend
              </Button>
            )}
          </PermissionGuard>
        </div>
      ),
    },
  ]

  return (
    <div className="apage">
      <FilterBar
        search={q.search}
        onSearchChange={q.setSearch}
        searchPlaceholder="Search by name or email"
        onReset={q.reset}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: q.filters.status,
            onChange: (v) => q.setFilter('status', v),
            options: [
              { value: '', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'suspended', label: 'Suspended' },
            ],
          },
          {
            key: 'plan',
            label: 'Plan',
            value: q.filters.plan,
            onChange: (v) => q.setFilter('plan', v),
            options: [
              { value: '', label: 'All' },
              { value: 'Free', label: 'Free' },
              { value: 'Pro', label: 'Pro' },
              { value: 'Team', label: 'Team' },
            ],
          },
        ]}
      />

      <DataTable
        columns={columns}
        rows={list.data?.items}
        rowKey={(u) => u.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        onRowClick={(u) => navigate(`/admin/users/${u.id}`)}
        emptyTitle="No users match"
        emptyHint="Try a different search or clear the filters."
        page={q.page}
        pageSize={PAGE_SIZE}
        total={list.data?.total ?? 0}
        onPageChange={q.setPage}
      />

      <ConfirmDialog
        open={target?.action === 'suspend'}
        title={`Suspend ${target?.user.email ?? ''}?`}
        description="They will be signed out and unable to sign in until reactivated. Their data is kept. This is recorded in the audit log."
        confirmLabel="Suspend user"
        danger
        reasonLabel="Reason (required, saved to the audit log)"
        onClose={() => setTarget(null)}
        onConfirm={async (reason) => {
          await adminApi.suspendUser(target!.user.id, reason)
          toast('ok', `${target!.user.email} suspended.`)
          list.reload()
        }}
      />
      <ConfirmDialog
        open={target?.action === 'reactivate'}
        title={`Reactivate ${target?.user.email ?? ''}?`}
        description="They will be able to sign in again."
        confirmLabel="Reactivate"
        onClose={() => setTarget(null)}
        onConfirm={async () => {
          await adminApi.reactivateUser(target!.user.id)
          toast('ok', `${target!.user.email} reactivated.`)
          list.reload()
        }}
      />
    </div>
  )
}
