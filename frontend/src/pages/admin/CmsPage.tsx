import { useNavigate } from 'react-router-dom'
import DataTable, { type Column } from '../../components/admin/DataTable'
import FilterBar from '../../components/admin/FilterBar'
import StatusBadge from '../../components/admin/StatusBadge'
import PermissionGuard from '../../components/admin/PermissionGuard'
import { Button } from '../../components/ui/Button'
import { useAsync } from '../../lib/adminHooks'
import { useTableQuery } from '../../lib/adminQuery'
import { relativeTime } from '../../lib/format'
import { adminApi, CMS_TYPES, type AdminCmsItem } from '../../services/adminApi'

const PAGE_SIZE = 15
const typeLabel = (t: string) => CMS_TYPES.find((x) => x.value === t)?.label ?? t

const COLUMNS: Column<AdminCmsItem>[] = [
  { key: 'title', header: 'Title', render: (c) => <strong className="clip clip--wide">{c.title}</strong> },
  { key: 'type', header: 'Type', render: (c) => typeLabel(c.type) },
  { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} label={c.status === 'published' ? 'Published' : 'Draft'} /> },
  { key: 'version', header: 'Version', align: 'right', wide: true, render: (c) => `v${c.version}` },
  { key: 'author', header: 'Author', wide: true, render: (c) => c.author },
  { key: 'updated', header: 'Updated', wide: true, render: (c) => relativeTime(c.updatedAt) },
]

export default function CmsPage() {
  const navigate = useNavigate()
  const q = useTableQuery(['type', 'status'])
  const list = useAsync(
    () =>
      adminApi.cms({
        search: q.searchQuery,
        type: q.filters.type,
        status: q.filters.status,
        page: q.page,
        pageSize: PAGE_SIZE,
      }),
    [q.searchQuery, q.filters.type, q.filters.status, q.page],
  )

  return (
    <div className="apage">
      <FilterBar
        search={q.search}
        onSearchChange={q.setSearch}
        searchPlaceholder="Search title, slug or author"
        onReset={q.reset}
        filters={[
          {
            key: 'type',
            label: 'Type',
            value: q.filters.type,
            onChange: (v) => q.setFilter('type', v),
            options: [{ value: '', label: 'All' }, ...CMS_TYPES],
          },
          {
            key: 'status',
            label: 'Status',
            value: q.filters.status,
            onChange: (v) => q.setFilter('status', v),
            options: [
              { value: '', label: 'All' },
              { value: 'draft', label: 'Draft' },
              { value: 'published', label: 'Published' },
            ],
          },
        ]}
        actions={
          <PermissionGuard permission="cms.manage">
            <Button onClick={() => navigate('/admin/cms/new')}>New content</Button>
          </PermissionGuard>
        }
      />
      <DataTable
        columns={COLUMNS}
        rows={list.data?.items}
        rowKey={(c) => c.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        onRowClick={(c) => navigate(`/admin/cms/${c.id}`)}
        emptyTitle="No content yet"
        emptyHint="Create a draft, preview it, then publish when it is ready."
        page={q.page}
        pageSize={PAGE_SIZE}
        total={list.data?.total ?? 0}
        onPageChange={q.setPage}
      />
    </div>
  )
}
