import DataTable, { type Column } from '../../components/admin/DataTable'
import FilterBar from '../../components/admin/FilterBar'
import { useAsync } from '../../lib/adminHooks'
import { useTableQuery } from '../../lib/adminQuery'
import { formatNumber, relativeTime } from '../../lib/format'
import { adminApi, type AdminKnowledgeBaseItem } from '../../services/adminApi'

const PAGE_SIZE = 15

const COLUMNS: Column<AdminKnowledgeBaseItem>[] = [
  { key: 'name', header: 'Knowledge base', render: (k) => <strong>{k.name}</strong> },
  { key: 'owner', header: 'Owner', render: (k) => k.ownerEmail },
  { key: 'ws', header: 'Workspace', wide: true, render: (k) => k.workspace ?? <span className="muted">Personal</span> },
  { key: 'docs', header: 'Documents', align: 'right', render: (k) => k.documents },
  { key: 'chunks', header: 'Chunks', align: 'right', render: (k) => formatNumber(k.chunks) },
  { key: 'created', header: 'Created', wide: true, render: (k) => relativeTime(k.createdAt) },
]

export default function KnowledgeBasesPage() {
  const q = useTableQuery()
  const list = useAsync(
    () => adminApi.knowledgeBases({ search: q.searchQuery, page: q.page, pageSize: PAGE_SIZE }),
    [q.searchQuery, q.page],
  )

  return (
    <div className="apage">
      <FilterBar search={q.search} onSearchChange={q.setSearch} searchPlaceholder="Search by name or owner" onReset={q.reset} />
      <DataTable
        columns={COLUMNS}
        rows={list.data?.items}
        rowKey={(k) => k.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        emptyTitle="No knowledge bases"
        page={q.page}
        pageSize={PAGE_SIZE}
        total={list.data?.total ?? 0}
        onPageChange={q.setPage}
      />
    </div>
  )
}
