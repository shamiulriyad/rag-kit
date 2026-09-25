import DataTable, { type Column } from '../../components/admin/DataTable'
import FilterBar from '../../components/admin/FilterBar'
import StatusBadge from '../../components/admin/StatusBadge'
import { useAsync } from '../../lib/adminHooks'
import { useTableQuery } from '../../lib/adminQuery'
import { adminApi, type AdminSecurityEvent } from '../../services/adminApi'

const PAGE_SIZE = 25

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

const TYPE_LABEL: Record<string, { status: string; label: string }> = {
  login_failed: { status: 'failed', label: 'Failed sign-in' },
  login_suspended: { status: 'denied', label: 'Suspended account' },
  rate_limited: { status: 'denied', label: 'Rate limited' },
  admin_denied: { status: 'failed', label: 'Admin access denied' },
}

/** One table for both pages: security events (sign-in problems) and rate-limit events (requests the
 *  limiter blocked). Both come from real recorded events; the API never returns tokens or passwords. */
export default function SecurityEventsPage({ kind }: { kind: 'security' | 'ratelimit' }) {
  const rate = kind === 'ratelimit'
  const q = useTableQuery(['type'])
  const list = useAsync(
    () =>
      rate
        ? adminApi.rateLimitEvents({ search: q.searchQuery, page: q.page, pageSize: PAGE_SIZE })
        : adminApi.securityEvents({ search: q.searchQuery, type: q.filters.type, page: q.page, pageSize: PAGE_SIZE }),
    [rate, q.searchQuery, q.filters.type, q.page],
  )

  const columns: Column<AdminSecurityEvent>[] = [
    { key: 'at', header: 'Time', render: (e) => <span className="nowrap">{when(e.at)}</span> },
    {
      key: 'type',
      header: 'Event',
      render: (e) => {
        const t = TYPE_LABEL[e.type]
        return t ? <StatusBadge status={t.status} label={t.label} /> : e.type
      },
    },
    ...(rate ? [] : [{ key: 'email', header: 'Email', render: (e: AdminSecurityEvent) => e.email ?? '—' }]),
    { key: 'ip', header: 'IP address', render: (e) => (e.ip ? <code>{e.ip}</code> : '—') },
    { key: 'path', header: 'Path', wide: true, render: (e) => e.path ?? '—' },
    { key: 'details', header: 'Details', wide: true, render: (e) => <span className="clip">{e.details ?? '—'}</span> },
  ]

  return (
    <div className="apage">
      <FilterBar
        search={q.search}
        onSearchChange={q.setSearch}
        searchPlaceholder={rate ? 'Search IP or path' : 'Search email or IP'}
        onReset={q.reset}
        filters={
          rate
            ? []
            : [
                {
                  key: 'type',
                  label: 'Event',
                  value: q.filters.type,
                  onChange: (v) => q.setFilter('type', v),
                  options: [
                    { value: '', label: 'All' },
                    { value: 'login_failed', label: 'Failed sign-in' },
                    { value: 'login_suspended', label: 'Suspended account' },
                    { value: 'admin_denied', label: 'Admin access denied' },
                  ],
                },
              ]
        }
      />
      <DataTable
        columns={columns}
        rows={list.data?.items}
        rowKey={(e) => e.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        emptyTitle={rate ? 'No blocked requests' : 'No security events'}
        emptyHint={
          rate
            ? 'Requests blocked by the rate limiter appear here (one entry per client and path per minute).'
            : 'Failed sign-ins and sign-ins to suspended accounts appear here. Only events since this feature was added are recorded.'
        }
        page={q.page}
        pageSize={PAGE_SIZE}
        total={list.data?.total ?? 0}
        onPageChange={q.setPage}
      />
    </div>
  )
}
