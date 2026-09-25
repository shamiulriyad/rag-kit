import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDebounced } from './adminHooks'

/** Search + filter + page state for a server-paged table. Initial search/filter values come from
 *  the URL (`?search=`, `?status=`) so dashboard widgets and global search can deep-link into a
 *  filtered list. Any change to a filter sends the table back to page 1. */
export function useTableQuery(filterKeys: string[] = []) {
  const [params] = useSearchParams()
  const [search, setSearchState] = useState(params.get('search') ?? '')
  const [filters, setFilters] = useState<Record<string, string>>(() =>
    Object.fromEntries(filterKeys.map((k) => [k, params.get(k) ?? ''])),
  )
  const [page, setPage] = useState(1)
  const debounced = useDebounced(search, 300)

  return {
    search,
    setSearch: (v: string) => {
      setSearchState(v)
      setPage(1)
    },
    /** The value actually sent to the server (debounced). */
    searchQuery: debounced.trim(),
    filters,
    setFilter: (key: string, value: string) => {
      setFilters((f) => ({ ...f, [key]: value }))
      setPage(1)
    },
    page,
    setPage,
    reset: () => {
      setSearchState('')
      setFilters(Object.fromEntries(filterKeys.map((k) => [k, ''])))
      setPage(1)
    },
  }
}
