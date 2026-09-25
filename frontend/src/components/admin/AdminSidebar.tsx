import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, ShieldCheck, X } from 'lucide-react'
import { ADMIN_NAV } from '../../lib/adminNav'
import { useAdmin } from '../../lib/admin'

const STORAGE_KEY = 'rag-admin.nav.collapsed'

function readCollapsed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

/** Grouped, collapsible navigation. Items the admin lacks permission for are hidden; items not
 *  built yet are shown disabled rather than linking to a placeholder page. */
export default function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useLocation()
  const { can } = useAdmin()
  const [collapsed, setCollapsed] = useState<string[]>(readCollapsed)

  // Opening a page always reveals its own group.
  useEffect(() => {
    const active = ADMIN_NAV.find((g) =>
      g.items.some((i) => !i.soon && (i.to === '/admin' ? pathname === '/admin' : pathname.startsWith(i.to))),
    )
    if (active) setCollapsed((c) => (c.includes(active.id) ? c.filter((x) => x !== active.id) : c))
  }, [pathname])

  function toggle(id: string) {
    setCollapsed((c) => {
      const next = c.includes(id) ? c.filter((x) => x !== id) : [...c, id]
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* storage unavailable: the state just isn't remembered */
      }
      return next
    })
  }

  return (
    <aside className={`asidebar${open ? ' asidebar--open' : ''}`} aria-label="Admin navigation">
      <div className="asidebar__brand">
        <Link to="/admin" className="logo" onClick={onClose}>
          <span className="logo__mark">
            <ShieldCheck strokeWidth={2.4} />
          </span>
          RAG Admin
        </Link>
        <button className="btn btn--ghost btn--sm asidebar__close" onClick={onClose} aria-label="Close navigation">
          <X size={16} />
        </button>
      </div>

      <nav className="asidebar__nav">
        {ADMIN_NAV.map((group) => {
          const items = group.items.filter((i) => i.soon || !i.permission || can(i.permission))
          if (items.length === 0) return null
          const isCollapsed = collapsed.includes(group.id)
          const panelId = `nav-${group.id}`
          return (
            <div className="agroup" key={group.id}>
              <button
                className="agroup__toggle"
                aria-expanded={!isCollapsed}
                aria-controls={panelId}
                onClick={() => toggle(group.id)}
              >
                {group.label}
                <ChevronDown size={14} className={isCollapsed ? 'is-closed' : ''} aria-hidden />
              </button>
              {!isCollapsed && (
                <ul id={panelId}>
                  {items.map((item) => (
                    <li key={item.to}>
                      {item.soon ? (
                        <span className="anav anav--soon" aria-disabled="true">
                          <item.icon />
                          <span className="anav__label">{item.label}</span>
                          <em>Soon</em>
                        </span>
                      ) : (
                        <NavLink
                          to={item.to}
                          end={item.to === '/admin'}
                          onClick={onClose}
                          className={({ isActive }) => `anav${isActive ? ' anav--active' : ''}`}
                        >
                          <item.icon />
                          {item.label}
                        </NavLink>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
