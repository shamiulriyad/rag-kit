import type { AdminAuditItem } from '../../services/adminApi'
import DataTable, { type Column, type DataTableProps } from './DataTable'
import StatusBadge from './StatusBadge'

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const COLUMNS: Column<AdminAuditItem>[] = [
  { key: 'at', header: 'Time', render: (a) => <span className="nowrap">{when(a.at)}</span> },
  { key: 'actor', header: 'Actor', render: (a) => a.actor || '—' },
  { key: 'action', header: 'Action', render: (a) => <code>{a.action}</code> },
  {
    key: 'resource',
    header: 'Resource',
    render: (a) => (
      <>
        {a.resourceType}
        {a.resourceId && <span className="muted"> · {a.resourceId.slice(0, 8)}</span>}
      </>
    ),
  },
  { key: 'result', header: 'Result', render: (a) => <StatusBadge status={a.result} /> },
  { key: 'details', header: 'Details', wide: true, render: (a) => <span className="clip">{a.details ?? '—'}</span> },
]

/** Audit rows are read-only and already sanitised by the API (no secrets, tokens or stack traces). */
export default function AuditLogTable(props: Omit<DataTableProps<AdminAuditItem>, 'columns' | 'rowKey'>) {
  return (
    <DataTable
      {...props}
      columns={COLUMNS}
      rowKey={(a) => a.id}
      emptyTitle="No audit entries"
      emptyHint="Admin actions such as suspending a user or retrying a job are recorded here."
    />
  )
}
