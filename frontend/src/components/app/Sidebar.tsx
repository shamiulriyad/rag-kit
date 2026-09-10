import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  MessagesSquare,
  Settings,
  BookOpen,
  LogOut,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Logo from '../ui/Logo'
import { GithubIcon } from '../ui/icons'
import { useAuth } from '../../lib/auth'
import { initials } from '../../lib/format'

const NAV: { section: string; items: { to: string; label: string; icon: LucideIcon }[] }[] = [
  {
    section: 'Workspace',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/documents', label: 'Documents', icon: FileText },
      { to: '/chat', label: 'Knowledge Chat', icon: MessagesSquare },
    ],
  },
  {
    section: 'Configure',
    items: [
      { to: '/settings', label: 'Settings', icon: Settings },
      { to: '/docs', label: 'Documentation', icon: BookOpen },
    ],
  },
]

export default function Sidebar({
  open,
  onNavigate,
}: {
  open: boolean
  onNavigate: () => void
}) {
  const { user, signOut } = useAuth()

  return (
    <aside className={`sidebar scroll${open ? ' sidebar--open' : ''}`}>
      <div className="sidebar__brand">
        <Logo to="/dashboard" />
      </div>

      {NAV.map((group) => (
        <div key={group.section}>
          <div className="sidebar__section">{group.section}</div>
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `navlink${isActive ? ' navlink--active' : ''}`
              }
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}

      <div className="sidebar__foot">
        <a
          className="navlink"
          href="https://github.com/shamiulriyad/rag-kit"
          target="_blank"
          rel="noreferrer noopener"
        >
          <GithubIcon />
          GitHub Repo
        </a>
        <button className="navlink" onClick={signOut} style={{ width: '100%' }}>
          <LogOut />
          Sign Out
        </button>
        <div className="sidebar__user">
          <span className="avatar">{initials(user?.name ?? 'U')}</span>
          <div>
            <strong>{user?.name}</strong>
            <span>{user?.email}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
