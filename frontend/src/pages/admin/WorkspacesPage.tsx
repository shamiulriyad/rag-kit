import { useState } from 'react'
import DataTable, { type Column } from '../../components/admin/DataTable'
import FilterBar from '../../components/admin/FilterBar'
import DetailDrawer from '../../components/admin/DetailDrawer'
import StatusBadge from '../../components/admin/StatusBadge'
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/admin/states'
import { useAsync } from '../../lib/adminHooks'
import { useTableQuery } from '../../lib/adminQuery'
import { formatBytes, relativeTime } from '../../lib/format'
import { adminApi, type AdminWorkspaceItem } from '../../services/adminApi'

const PAGE_SIZE = 15

function WorkspaceDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const detail = useAsync(() => (id ? adminApi.workspace(id) : Promise.resolve(null)), [id])
  const d = detail.data

  return (
    <DetailDrawer open={id !== null} title={d?.workspace.name ?? 'Workspace'} subtitle={d?.workspace.ownerEmail} onClose={onClose}>
      {detail.error ? (
        <ErrorState message={detail.error} onRetry={detail.reload} />
      ) : !d || detail.loading ? (
        <LoadingSkeleton lines={6} height={16} />
      ) : (
        <>
          <h4 className="drawer__h">Members ({d.members.length})</h4>
          {d.members.length === 0 ? (
            <EmptyState title="No members" />
          ) : (
            <ul className="alist">
              {d.members.map((m, i) => (
                <li key={i}>
                  <div>
                    <span style={{ color: 'var(--text)' }}>{m.email}</span>
                    <span>{m.role}</span>
                  </div>
                  <StatusBadge status={m.status} />
                </li>
              ))}
            </ul>
          )}
          <h4 className="drawer__h">Knowledge bases ({d.knowledgeBases.length})</h4>
          {d.knowledgeBases.length === 0 ? (
            <EmptyState title="No knowledge bases" />
          ) : (
            <ul className="alist">
              {d.knowledgeBases.map((k) => (
                <li key={k.id}>
                  <div>
                    <span style={{ color: 'var(--text)' }}>{k.name}</span>
                    <span>{k.documents} documents · {k.chunks} chunks</span>
                  </div>
                  <span className="muted nowrap">{relativeTime(k.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </DetailDrawer>
  )
}

export default function WorkspacesPage() {
  const q = useTableQuery()
  const [open, setOpen] = useState<string | null>(null)

  const list = useAsync(
    () => adminApi.workspaces({ search: q.searchQuery, page: q.page, pageSize: PAGE_SIZE }),
    [q.searchQuery, q.page],
  )

  const columns: Column<AdminWorkspaceItem>[] = [
    { key: 'name', header: 'Workspace', render: (w) => <strong>{w.name}</strong> },
    { key: 'owner', header: 'Owner', render: (w) => w.ownerEmail },
    { key: 'members', header: 'Members', align: 'right', render: (w) => w.members },
    { key: 'kbs', header: 'Knowledge bases', align: 'right', wide: true, render: (w) => w.knowledgeBases },
    { key: 'docs', header: 'Documents', align: 'right', render: (w) => w.documents },
    { key: 'storage', header: 'Storage', align: 'right', wide: true, render: (w) => formatBytes(w.storageBytes) },
    { key: 'created', header: 'Created', wide: true, render: (w) => relativeTime(w.createdAt) },
  ]

  return (
    <div className="apage">
      <FilterBar search={q.search} onSearchChange={q.setSearch} searchPlaceholder="Search by workspace or owner" onReset={q.reset} />
      <DataTable
        columns={columns}
        rows={list.data?.items}
        rowKey={(w) => w.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        onRowClick={(w) => setOpen(w.id)}
        emptyTitle="No workspaces"
        emptyHint="Workspaces appear here once a customer creates one."
        page={q.page}
        pageSize={PAGE_SIZE}
        total={list.data?.total ?? 0}
        onPageChange={q.setPage}
      />
      <WorkspaceDrawer id={open} onClose={() => setOpen(null)} />
    </div>
  )
}
