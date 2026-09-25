import { useNavigate } from 'react-router-dom'
import DataTable, { type Column } from '../../components/admin/DataTable'
import FilterBar from '../../components/admin/FilterBar'
import { TicketBadge } from '../../components/support/Thread'
import { useAsync } from '../../lib/adminHooks'
import { useTableQuery } from '../../lib/adminQuery'
import { relativeTime } from '../../lib/format'
import { adminApi, type AdminTicketItem } from '../../services/adminApi'

const PAGE_SIZE = 15

export const ticketColumns: Column<AdminTicketItem>[] = [
  { key: 'subject', header: 'Subject', render: (t) => <strong className="clip clip--wide">{t.subject}</strong> },
  { key: 'user', header: 'Customer', wide: true, render: (t) => t.userEmail },
  { key: 'status', header: 'Status', render: (t) => <TicketBadge status={t.status} /> },
  { key: 'msgs', header: 'Messages', align: 'right', wide: true, render: (t) => t.messages },
  { key: 'updated', header: 'Last activity', render: (t) => relativeTime(t.updatedAt) },
]

export default function SupportInboxPage() {
  const navigate = useNavigate()
  const q = useTableQuery(['status'])
  const list = useAsync(
    () => adminApi.tickets({ search: q.searchQuery, status: q.filters.status, page: q.page, pageSize: PAGE_SIZE }),
    [q.searchQuery, q.filters.status, q.page],
  )

  return (
    <div className="apage">
      <FilterBar
        search={q.search}
        onSearchChange={q.setSearch}
        searchPlaceholder="Search subject or customer email"
        onReset={q.reset}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: q.filters.status,
            onChange: (v) => q.setFilter('status', v),
            options: [
              { value: '', label: 'All' },
              { value: 'open', label: 'Open (needs reply)' },
              { value: 'answered', label: 'Answered' },
              { value: 'closed', label: 'Closed' },
            ],
          },
        ]}
      />
      <DataTable
        columns={ticketColumns}
        rows={list.data?.items}
        rowKey={(t) => t.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        onRowClick={(t) => navigate(`/admin/support/${t.id}`)}
        emptyTitle="No tickets"
        emptyHint="Tickets customers open from the Support page appear here. Open tickets that need a reply are listed first."
        page={q.page}
        pageSize={PAGE_SIZE}
        total={list.data?.total ?? 0}
        onPageChange={q.setPage}
      />
    </div>
  )
}
