import { useState } from 'react'
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
import { adminApi, type AdminApiKey } from '../../services/adminApi'

const PAGE_SIZE = 15

export default function ApiKeysPage() {
  const toast = useToast()
  const q = useTableQuery(['status'])
  const [target, setTarget] = useState<AdminApiKey | null>(null)
  const list = useAsync(
    () => adminApi.apiKeys({ search: q.searchQuery, status: q.filters.status, page: q.page, pageSize: PAGE_SIZE }),
    [q.searchQuery, q.filters.status, q.page],
  )

  const columns: Column<AdminApiKey>[] = [
    { key: 'name', header: 'Name', render: (k) => <strong>{k.name}</strong> },
    { key: 'prefix', header: 'Key', render: (k) => <code>{k.prefix}…</code> },
    { key: 'owner', header: 'Owner', render: (k) => k.owner },
    { key: 'status', header: 'Status', render: (k) => <StatusBadge status={k.status === 'revoked' || k.status === 'expired' ? 'failed' : 'active'} label={k.status[0].toUpperCase() + k.status.slice(1)} /> },
    { key: 'used', header: 'Last used', wide: true, render: (k) => (k.lastUsedAt ? relativeTime(k.lastUsedAt) : 'Never') },
    { key: 'exp', header: 'Expires', wide: true, render: (k) => (k.expiresAt ? relativeTime(k.expiresAt) : 'Never') },
    { key: 'created', header: 'Created', wide: true, render: (k) => relativeTime(k.createdAt) },
    {
      key: 'actions',
      header: 'Actions',
      render: (k) => (
        <PermissionGuard permission="security.manage">
          {k.status !== 'revoked' && (
            <Button variant="danger" size="sm" onClick={() => setTarget(k)}>
              Revoke
            </Button>
          )}
        </PermissionGuard>
      ),
    },
  ]

  return (
    <div className="apage">
      <FilterBar
        search={q.search}
        onSearchChange={q.setSearch}
        searchPlaceholder="Search name, key prefix or owner"
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
              { value: 'expired', label: 'Expired' },
              { value: 'revoked', label: 'Revoked' },
            ],
          },
        ]}
      />
      <DataTable
        columns={columns}
        rows={list.data?.items}
        rowKey={(k) => k.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        emptyTitle="No API keys"
        emptyHint="Keys customers create in the developer portal appear here."
        page={q.page}
        pageSize={PAGE_SIZE}
        total={list.data?.total ?? 0}
        onPageChange={q.setPage}
      />
      <p className="muted" style={{ fontSize: '0.78rem' }}>
        Only the key prefix is shown. Full keys are never stored, so they cannot be viewed or recovered here.
      </p>
      <ConfirmDialog
        open={target !== null}
        title={`Revoke ${target?.name ?? 'this key'}?`}
        description={`The key ${target?.prefix ?? ''}… owned by ${target?.owner ?? ''} stops working immediately. This cannot be undone and is recorded in the audit log.`}
        confirmLabel="Revoke key"
        danger
        onClose={() => setTarget(null)}
        onConfirm={async () => {
          await adminApi.revokeApiKey(target!.id)
          toast('ok', 'API key revoked.')
          list.reload()
        }}
      />
    </div>
  )
}
