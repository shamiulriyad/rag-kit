import { useState } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import { Menu, Search, Sparkles } from 'lucide-react'
import Sidebar from './Sidebar'
import HelpMenu from './HelpMenu'
import ShortcutsModal from './ShortcutsModal'
import NotificationBell from '../notifications/NotificationBell'
import CommandPalette from '../search/CommandPalette'
import StatusPill from '../ui/StatusPill'
import { usePlatformStatus } from '../../lib/platformStatus'
import { useUI } from '../../lib/ui'

const TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of your retrieval workspace' },
  '/knowledge-bases': {
    title: 'Knowledge Bases',
    subtitle: 'Collections of documents your team can ask questions against',
  },
  '/documents': {
    title: 'Documents',
    subtitle: 'Upload, index and inspect your source PDFs',
  },
  '/chat': {
    title: 'Knowledge Chat',
    subtitle: 'Ask questions grounded in your documents',
  },
  '/chat-history': {
    title: 'Chat History',
    subtitle: 'Every conversation you have had with your knowledge bases',
  },
  '/analytics': {
    title: 'Analytics',
    subtitle: 'Usage across questions, documents and knowledge bases',
  },
  '/developer': {
    title: 'Developer Portal',
    subtitle: 'API keys, documentation and self-hosting resources',
  },
  '/billing': { title: 'Billing & Usage', subtitle: 'Plan, limits and monthly usage' },
  '/team': { title: 'Team', subtitle: 'Members, roles and invitations' },
  '/activity': { title: 'Activity', subtitle: 'A timeline of everything that happened' },
  '/settings': {
    title: 'Settings',
    subtitle: 'Pipeline, retrieval, appearance and providers',
  },
  '/docs': { title: 'Documentation', subtitle: 'Everything you need to run RAG Starter' },
}

export default function AppLayout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const { setSearchOpen } = useUI()
  const platform = usePlatformStatus(60_000)
  const meta = TITLES[pathname] ?? { title: 'RAG Starter', subtitle: '' }

  return (
    <div className="shell">
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <Sidebar open={open} onNavigate={() => setOpen(false)} />

      <div className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="topbar__burger"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div className="topbar__title">
              <strong>{meta.title}</strong>
              {meta.subtitle && <span>{meta.subtitle}</span>}
            </div>
          </div>

          <div className="topbar__actions">
            <button
              className="searchbtn"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
            >
              <Search size={15} />
              <span>Search…</span>
              <kbd>Ctrl K</kbd>
            </button>
            <NotificationBell />
            <HelpMenu />
            {platform?.maintenanceMode && <StatusPill status="warn" label="Under maintenance" />}
            {pathname !== '/chat' && (
              <Link className="btn btn--secondary btn--sm" to="/chat">
                <Sparkles size={15} />
                Ask a question
              </Link>
            )}
          </div>
        </header>

        <Outlet />
      </div>

      <CommandPalette />
      <ShortcutsModal />
    </div>
  )
}
