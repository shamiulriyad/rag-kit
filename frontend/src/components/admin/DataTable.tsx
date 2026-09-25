import type { ReactNode } from 'react'
import { EmptyState, ErrorState } from './states'
import Pagination from './Pagination'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  align?: 'right'
  /** Hide below the tablet breakpoint to keep dense tables readable. */
  wide?: boolean
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  onRowClick?: (row: T) => void
  emptyTitle?: string
  emptyHint?: string
  /** Server-side pagination: pass all three to show the pager. */
  page?: number
  pageSize?: number
  total?: number
  onPageChange?: (page: number) => void
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  onRowClick,
  emptyTitle = 'Nothing here yet',
  emptyHint,
  page,
  pageSize,
  total,
  onPageChange,
}: DataTableProps<T>) {
  if (error && !rows?.length) return <ErrorState message={error} onRetry={onRetry} />

  const showSkeleton = loading && !rows?.length
  const empty = !loading && !error && rows?.length === 0

  return (
    <div className="dtable">
      <div className="dtable__scroll">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`${c.align === 'right' ? 'is-right' : ''}${c.wide ? ' is-wide' : ''}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody aria-busy={loading}>
            {showSkeleton &&
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i} className="dtable__skeleton">
                  {columns.map((c) => (
                    <td key={c.key} className={c.wide ? 'is-wide' : ''}>
                      <span />
                    </td>
                  ))}
                </tr>
              ))}
            {rows?.map((row) => (
              <tr
                key={rowKey(row)}
                className={`${onRowClick ? 'is-clickable' : ''}${loading ? ' is-stale' : ''}`}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault()
                          onRowClick(row)
                        }
                      }
                    : undefined
                }
              >
                {columns.map((c) => (
                  <td key={c.key} className={`${c.align === 'right' ? 'is-right' : ''}${c.wide ? ' is-wide' : ''}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {empty && <EmptyState title={emptyTitle} hint={emptyHint} />}
      {page !== undefined && pageSize !== undefined && total !== undefined && onPageChange && (
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />
      )}
    </div>
  )
}
