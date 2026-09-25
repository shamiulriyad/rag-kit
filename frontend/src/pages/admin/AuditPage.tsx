import AuditLogTable from '../../components/admin/AuditLogTable'
import FilterBar from '../../components/admin/FilterBar'
import { useAsync } from '../../lib/adminHooks'
import { useTableQuery } from '../../lib/adminQuery'
import { adminApi } from '../../services/adminApi'

const PAGE_SIZE = 25

export default function AuditPage() {
  const q = useTableQuery(['result'])
  const list = useAsync(
    () => adminApi.audit({ search: q.searchQuery, result: q.filters.result, page: q.page, pageSize: PAGE_SIZE }),
    [q.searchQuery, q.filters.result, q.page],
  )
  return (
    <div className="apage">
      <FilterBar
        search={q.search}
        onSearchChange={q.setSearch}
        searchPlaceholder="Search actor, action or resource"
        onReset={q.reset}
        filters={[
          {
            key: 'result',
            label: 'Result',
            value: q.filters.result,
            onChange: (v) => q.setFilter('result', v),
            options: [
              { value: '', label: 'All' },
              { value: 'success', label: 'Success' },
              { value: 'failed', label: 'Failed' },
              { value: 'denied', label: 'Denied' },
            ],
          },
        ]}
      />
      <AuditLogTable
        rows={list.data?.items}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        page={q.page}
        pageSize={PAGE_SIZE}
        total={list.data?.total ?? 0}
        onPageChange={q.setPage}
      />
    </div>
  )
}
