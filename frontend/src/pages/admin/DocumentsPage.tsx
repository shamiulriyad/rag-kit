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
import { formatBytes, formatNumber, relativeTime } from '../../lib/format'
import { adminApi, type AdminDocumentItem } from '../../services/adminApi'

const PAGE_SIZE = 15

export default function DocumentsPage() {
  const toast = useToast()
  const q = useTableQuery(['status'])
  const [target, setTarget] = useState<AdminDocumentItem | null>(null)

  const list = useAsync(
    () => adminApi.documents({ search: q.searchQuery, status: q.filters.status, page: q.page, pageSize: PAGE_SIZE }),
    [q.searchQuery, q.filters.status, q.page],
  )

  const columns: Column<AdminDocumentItem>[] = [
    { key: 'file', header: 'Document', render: (d) => <strong className="clip clip--wide">{d.fileName}</strong> },
    { key: 'kb', header: 'Knowledge base', wide: true, render: (d) => d.knowledgeBase },
    { key: 'owner', header: 'Owner', wide: true, render: (d) => d.ownerEmail },
    {
      key: 'status',
      header: 'Status',
      render: (d) => (
        <>
          <StatusBadge status={d.status} />
          {d.error && <div className="field__error clip">{d.error}</div>}
        </>
      ),
    },
    { key: 'size', header: 'Size', align: 'right', render: (d) => formatBytes(d.fileSize) },
    { key: 'chunks', header: 'Chunks', align: 'right', wide: true, render: (d) => (d.chunks === null ? '—' : formatNumber(d.chunks)) },
    { key: 'created', header: 'Uploaded', wide: true, render: (d) => relativeTime(d.createdAt) },
    {
      key: 'actions',
      header: 'Actions',
      render: (d) => (
        <PermissionGuard permission="jobs.manage">
          <Button
            variant="secondary"
            size="sm"
            disabled={d.status === 'Queued' || d.status === 'Processing'}
            onClick={() => setTarget(d)}
          >
            Reprocess
          </Button>
        </PermissionGuard>
      ),
    },
  ]

  return (
    <div className="apage">
      <FilterBar
        search={q.search}
        onSearchChange={q.setSearch}
        searchPlaceholder="Search by file name or owner"
        onReset={q.reset}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: q.filters.status,
            onChange: (v) => q.setFilter('status', v),
            options: [
              { value: '', label: 'All' },
              { value: 'Queued', label: 'Queued' },
              { value: 'Processing', label: 'Processing' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Failed', label: 'Failed' },
            ],
          },
        ]}
      />
      <DataTable
        columns={columns}
        rows={list.data?.items}
        rowKey={(d) => d.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        emptyTitle="No documents"
        emptyHint="Nothing matches these filters."
        page={q.page}
        pageSize={PAGE_SIZE}
        total={list.data?.total ?? 0}
        onPageChange={q.setPage}
      />
      <ConfirmDialog
        open={target !== null}
        title={`Reprocess ${target?.fileName ?? ''}?`}
        description="A new processing job is queued and the document's existing chunks are replaced when it finishes. This is recorded in the audit log."
        confirmLabel="Queue reprocessing"
        onClose={() => setTarget(null)}
        onConfirm={async () => {
          await adminApi.reprocessDocument(target!.id)
          toast('ok', 'Reprocessing queued.')
          list.reload()
        }}
      />
    </div>
  )
}
