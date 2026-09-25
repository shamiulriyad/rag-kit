import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { Crumb } from '../../lib/adminNav'

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="crumbs">
      <ol>
        {items.map((c, i) => {
          const last = i === items.length - 1
          return (
            <Fragment key={`${c.label}-${i}`}>
              <li aria-current={last ? 'page' : undefined}>
                {c.to && !last ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
              </li>
              {!last && (
                <li aria-hidden className="crumbs__sep">
                  <ChevronRight size={13} />
                </li>
              )}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
