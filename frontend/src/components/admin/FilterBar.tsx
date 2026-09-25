import type { ReactNode } from 'react'
import { Search, X } from 'lucide-react'

export interface FilterOption {
  value: string
  label: string
}

export interface FilterDef {
  key: string
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
}

/** Search box plus dropdown filters. The parent owns the values and re-queries the server;
 *  nothing is filtered client-side, so pagination stays correct. */
export default function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
  onReset,
  actions,
}: {
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filters?: FilterDef[]
  onReset?: () => void
  actions?: ReactNode
}) {
  const dirty = Boolean(search) || filters.some((f) => f.value !== '')

  return (
    <div className="fbar" role="search">
      {onSearchChange && (
        <label className="fbar__search">
          <Search size={15} aria-hidden />
          <input
            className="input"
            type="search"
            value={search ?? ''}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </label>
      )}
      {filters.map((f) => (
        <label key={f.key} className="fbar__filter">
          <span>{f.label}</span>
          <select className="select" value={f.value} onChange={(e) => f.onChange(e.target.value)}>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      {onReset && dirty && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>
          <X size={14} /> Reset
        </button>
      )}
      {actions && <div className="fbar__actions">{actions}</div>}
    </div>
  )
}
