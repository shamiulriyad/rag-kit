import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../ui/Button'

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  return (
    <nav className="apager" aria-label="Pagination">
      <span>
        {total === 0 ? 'No results' : `${from}–${to} of ${total.toLocaleString('en-US')}`}
      </span>
      <div>
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </Button>
        <span className="apager__count">
          Page {page} of {pages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </Button>
      </div>
    </nav>
  )
}
