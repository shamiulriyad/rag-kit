import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Database,
  FileText,
  MessagesSquare,
  History,
  BarChart3,
  Users,
  Activity,
  Settings,
  FlaskConical,
  SquareTerminal,
  CreditCard,
  BookOpen,
  LifeBuoy,
  LogOut,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Logo from '../ui/Logo'
import { GithubIcon } from '../ui/icons'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import FavoritesNav from './FavoritesNav'
import { useAuth } from '../../lib/auth'
import { initials } from '../../lib/format'

const PRIMARY_NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/knowledge-bases', label: 'Knowledge Bases', icon: Database },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/chat', label: 'Knowledge Chat', icon: MessagesSquare },
  { to: '/chat-history', label: 'Chat History', icon: History },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/activity', label: 'Activity', icon: Activity },
  { to: '/settings', label: 'Settings', icon: Settings },
]

// Existing tools that predate this nav's spec — kept reachable, not deleted.
const MORE_NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/playground', label: 'RAG Playground', icon: FlaskConical },
  { to: '/prompt-playground', label: 'Prompt Playground', icon: SquareTerminal },
  { to: '/billing', label: 'Billing & Usage', icon: CreditCard },
  { to: '/developer', label: 'Developer Portal', icon: SquareTerminal },
  { to: '/docs', label: 'Documentation', icon: BookOpen },
]

function NavItems({ items, onNavigate }: { items: typeof PRIMARY_NAV; onNavigate: () => void }) {
  return (
    <>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) => `navlink${isActive ? ' navlink--active' : ''}`}
        >
          <item.icon />
          {item.label}
        </NavLink>
      ))}
    </>
  )
}

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

      <WorkspaceSwitcher />

      <div>
        <NavItems items={PRIMARY_NAV} onNavigate={onNavigate} />
      </div>

      <div>
        <div className="sidebar__section">More</div>
        <NavItems items={MORE_NAV} onNavigate={onNavigate} />
      </div>

      <FavoritesNav />

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
        <a className="navlink" href="mailto:support@ragstarter.dev">
          <LifeBuoy />
          Help &amp; Support
        </a>
        <button className="navlink" onClick={signOut} style={{ width: '100%' }}>
          <LogOut />
          Sign Out
        </button>
        <NavLink to="/settings" className="sidebar__user" onClick={onNavigate}>
          <span className="avatar">{initials(user?.name ?? 'U')}</span>
          <div>
            <strong>{user?.name}</strong>
            <span>{user?.email}</span>
          </div>
        </NavLink>
      </div>
    </aside>
  )
}
