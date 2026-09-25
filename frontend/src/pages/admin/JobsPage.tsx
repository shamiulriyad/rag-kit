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
import { adminApi, type AdminJobItem } from '../../services/adminApi'

const PAGE_SIZE = 15

export const formatDuration = (s: number | null) => {
  if (s === null) return '—'
  if (s < 60) return `${s.toFixed(1)} s`
  return `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`
}

// The worker has no stage finer than its status, so the "stage" column is derived from it.
const stageOf = (status: string) =>
  status === 'Queued' || status === 'RetryPending' ? 'Waiting in queue' : status === 'Processing' ? 'Chunk & embed' : 'Finished'

export default function JobsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const q = useTableQuery(['status'])
  const [target, setTarget] = useState<AdminJobItem | null>(null)

  const list = useAsync(
    () => adminApi.jobs({ search: q.searchQuery, status: q.filters.status, page: q.page, pageSize: PAGE_SIZE }),
    [q.searchQuery, q.filters.status, q.page],
  )

  const columns: Column<AdminJobItem>[] = [
    { key: 'id', header: 'Job', render: (j) => <code>{j.id.slice(0, 8)}</code> },
    { key: 'doc', header: 'Document', render: (j) => <strong className="clip clip--wide">{j.document}</strong> },
    { key: 'ws', header: 'Workspace', wide: true, render: (j) => j.workspace },
    { key: 'stage', header: 'Stage', wide: true, render: (j) => stageOf(j.status) },
    { key: 'status', header: 'Status', render: (j) => <StatusBadge status={j.status} /> },
    { key: 'att', header: 'Attempts', align: 'right', render: (j) => `${j.attempts}/${j.maxAttempts}` },
    { key: 'dur', header: 'Duration', align: 'right', wide: true, render: (j) => formatDuration(j.durationSeconds) },
    { key: 'err', header: 'Error', wide: true, render: (j) => (j.error ? <span className="field__error clip">{j.error}</span> : '—') },
    { key: 'created', header: 'Created', wide: true, render: (j) => relativeTime(j.createdAt) },
    { key: 'done', header: 'Completed', wide: true, render: (j) => (j.completedAt ? relativeTime(j.completedAt) : '—') },
    {
      key: 'actions',
      header: 'Actions',
      render: (j) => (
        <div className="rowactions" onClick={(e) => e.stopPropagation()}>
          <PermissionGuard permission="jobs.manage">
            {j.status === 'Failed' && (
              <Button variant="secondary" size="sm" onClick={() => setTarget(j)}>
                Retry
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
        searchPlaceholder="Search by document or job ID"
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
              { value: 'RetryPending', label: 'Retry pending' },
            ],
          },
        ]}
      />
      <DataTable
        columns={columns}
        rows={list.data?.items}
        rowKey={(j) => j.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        onRowClick={(j) => navigate(`/admin/jobs/${j.id}`)}
        emptyTitle="No jobs"
        emptyHint="No processing jobs match these filters."
        page={q.page}
        pageSize={PAGE_SIZE}
        total={list.data?.total ?? 0}
        onPageChange={q.setPage}
      />
      <p className="muted" style={{ fontSize: '0.78rem' }}>
        “Retry pending” is a job that ran, did not succeed, and is queued for another attempt. There is no “Cancelled”
        state: the worker cannot cancel a job.
      </p>
      <ConfirmDialog
        open={target !== null}
        title="Retry this job?"
        description={`A new processing job is queued for ${target?.document ?? 'this document'}. This is recorded in the audit log.`}
        confirmLabel="Retry job"
        onClose={() => setTarget(null)}
        onConfirm={async () => {
          await adminApi.retryJob(target!.id)
          toast('ok', 'Job re-queued.')
          list.reload()
        }}
      />
    </div>
  )
}
