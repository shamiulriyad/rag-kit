import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, LogOut, Menu, Search, User } from 'lucide-react'
import Breadcrumbs from './Breadcrumbs'
import { crumbsFor } from '../../lib/adminNav'
import { useAdmin } from '../../lib/admin'
import { useAuth } from '../../lib/auth'
import { useAsync, useDebounced } from '../../lib/adminHooks'
import { useDismiss } from '../../lib/hooks'
import { adminApi, type AdminSearchHit } from '../../services/adminApi'
import { initials } from '../../lib/format'

function GlobalSearch() {
  const navigate = useNavigate()
  const { can } = useAdmin()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const term = useDebounced(q.trim(), 300)
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false))
  const searchable = can('users.view')

  const { data, loading } = useAsync<AdminSearchHit[]>(
    () => (searchable && term.length >= 2 ? adminApi.search(term) : Promise.resolve([])),
    [term, searchable],
  )

  if (!searchable) return null

  function go(hit: AdminSearchHit) {
    setOpen(false)
    setQ('')
    if (hit.type === 'user') navigate(`/admin/users/${hit.id}`)
    else if (hit.type === 'workspace') navigate(`/admin/workspaces?search=${encodeURIComponent(hit.label)}`)
    else navigate(`/admin/documents?search=${encodeURIComponent(hit.label)}`)
  }

  const hits = term.length >= 2 ? (data ?? []) : []

  return (
    <div className="gsearch" ref={ref}>
      <Search size={15} aria-hidden />
      <input
        className="input"
        type="search"
        placeholder="Search users, workspaces, documents…"
        aria-label="Global search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
      />
      {open && term.length >= 2 && (
        <div className="gsearch__panel" role="listbox">
          {loading && hits.length === 0 && <div className="gsearch__note">Searching…</div>}
          {!loading && hits.length === 0 && <div className="gsearch__note">No matches for “{term}”.</div>}
          {hits.map((h) => (
            <button key={`${h.type}-${h.id}`} role="option" aria-selected={false} onClick={() => go(h)}>
              <span className="gsearch__type">{h.type}</span>
              <span>
                <strong>{h.label}</strong>
                {h.sub && <em>{h.sub}</em>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** The bell reports one thing that is actually true: jobs that failed and still need a look. */
function Alerts() {
  const { can } = useAdmin()
  const [open, setOpen] = useState(false)
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false))
  const allowed = can('jobs.view')
  const { data } = useAsync(
    () => (allowed ? adminApi.jobs({ status: 'Failed', page: 1, pageSize: 5 }) : Promise.resolve(null)),
    [allowed],
  )
  if (!allowed) return null
  const total = data?.total ?? 0

  return (
    <div className="ahead__menu" ref={ref}>
      <button
        className="btn btn--ghost btn--sm ahead__icon"
        aria-label={`Alerts, ${total} failed processing jobs`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Bell size={17} />
        {total > 0 && <span className="ahead__badge">{total > 99 ? '99+' : total}</span>}
      </button>
      {open && (
        <div className="ahead__panel">
          <strong>Failed processing jobs</strong>
          {total === 0 ? (
            <p>No failed jobs.</p>
          ) : (
            <>
              <ul>
                {data?.items.map((j) => (
                  <li key={j.id}>
                    <Link to={`/admin/jobs/${j.id}`} onClick={() => setOpen(false)}>
                      {j.document}
                    </Link>
                    <span>{j.error ?? 'No error recorded'}</span>
                  </li>
                ))}
              </ul>
              <Link className="ahead__all" to="/admin/jobs?status=Failed" onClick={() => setOpen(false)}>
                View all {total} failed jobs
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ProfileMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false))

  return (
    <div className="ahead__menu" ref={ref}>
      <button className="ahead__profile" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>
        <span className="avatar">{initials(user?.fullName ?? 'A')}</span>
        <span className="ahead__who">
          <strong>{user?.fullName}</strong>
          <em>Platform admin</em>
        </span>
      </button>
      {open && (
        <div className="ahead__panel ahead__panel--menu" role="menu">
          <span className="ahead__email">
            <User size={14} /> {user?.email}
          </span>
          <Link role="menuitem" to="/dashboard">
            <ArrowLeft size={15} /> Back to user app
          </Link>
          <button role="menuitem" onClick={signOut}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default function AdminHeader({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation()
  const { title, crumbs } = crumbsFor(pathname)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Move focus to the page heading on navigation so keyboard/screen-reader users start at the content.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <header className="ahead">
      <div className="ahead__row">
        <button className="btn btn--ghost btn--sm ahead__burger" onClick={onMenu} aria-label="Open navigation">
          <Menu size={18} />
        </button>
        <div className="ahead__title">
          <Breadcrumbs items={crumbs} />
          <h1 ref={headingRef} tabIndex={-1}>
            {title}
          </h1>
        </div>
        <GlobalSearch />
        <Alerts />
        <ProfileMenu />
      </div>
    </header>
  )
}
