import {
  LayoutDashboard,
  Users,
  Building2,
  Database,
  FileText,
  Mail,
  Cpu,
  HeartPulse,
  Layers,
  CreditCard,
  Receipt,
  Wallet,
  Globe,
  ScrollText,
  ShieldCheck,
  KeyRound,
  Siren,
  Gauge,
  LifeBuoy,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface AdminNavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Permission required to see it (the API still enforces access). */
  permission?: string
  /** Not built yet: shown disabled instead of leading to a fake page. */
  soon?: boolean
}

export interface AdminNavGroup {
  id: string
  label: string
  items: AdminNavItem[]
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' }],
  },
  {
    id: 'platform',
    label: 'Platform Management',
    items: [
      { to: '/admin/users', label: 'Users', icon: Users, permission: 'users.view' },
      { to: '/admin/workspaces', label: 'Workspaces', icon: Building2, permission: 'workspaces.view' },
      { to: '/admin/knowledge-bases', label: 'Knowledge Bases', icon: Database, permission: 'workspaces.view' },
      { to: '/admin/documents', label: 'Documents', icon: FileText, permission: 'workspaces.view' },
      { to: '/admin/invitations', label: 'Invitations', icon: Mail, permission: 'workspaces.view' },
    ],
  },
  {
    id: 'rag',
    label: 'AI and RAG Operations',
    items: [
      { to: '/admin/jobs', label: 'Processing Jobs', icon: Cpu, permission: 'jobs.view' },
      { to: '/admin/health', label: 'System Health', icon: HeartPulse, permission: 'health.view' },
    ],
  },
  {
    id: 'business',
    label: 'Business Management',
    items: [
      { to: '/admin/plans', label: 'Plans', icon: Layers, permission: 'business.view' },
      { to: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard, permission: 'business.view' },
      { to: '/admin/billing-events', label: 'Billing Events', icon: Receipt, permission: 'business.view' },
      { to: '/admin/cost', label: 'Usage & Cost', icon: Wallet, permission: 'business.view' },
    ],
  },
  {
    id: 'cms',
    label: 'Website CMS',
    items: [
      { to: '/admin/cms', label: 'Content', icon: Globe, permission: 'cms.view' },
    ],
  },
  {
    id: 'security',
    label: 'Security and Compliance',
    items: [
      { to: '/admin/audit', label: 'Audit Logs', icon: ScrollText, permission: 'audit.view' },
      { to: '/admin/admins', label: 'Admin Users & Roles', icon: ShieldCheck, permission: 'security.view' },
      { to: '/admin/api-keys', label: 'API Keys', icon: KeyRound, permission: 'security.view' },
      { to: '/admin/security-events', label: 'Security Events', icon: Siren, permission: 'security.view' },
      { to: '/admin/rate-limits', label: 'Rate-limit Events', icon: Gauge, permission: 'security.view' },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    items: [{ to: '/admin/support', label: 'Support Tickets', icon: LifeBuoy, permission: 'support.view' }],
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [{ to: '/admin/settings', label: 'Platform Settings', icon: Settings, permission: 'settings.view' }],
  },
]

export interface Crumb {
  label: string
  to?: string
}

/** Breadcrumbs for a pathname, derived from the nav so they never drift from the sidebar. */
export function crumbsFor(pathname: string): { title: string; crumbs: Crumb[] } {
  const crumbs: Crumb[] = [{ label: 'Admin', to: '/admin' }]
  if (pathname === '/admin' || pathname === '/admin/') return { title: 'Dashboard', crumbs: [{ label: 'Dashboard' }] }

  let best: { group: AdminNavGroup; item: AdminNavItem } | null = null
  for (const group of ADMIN_NAV) {
    for (const item of group.items) {
      if (item.to !== '/admin' && (pathname === item.to || pathname.startsWith(item.to + '/'))) {
        if (!best || item.to.length > best.item.to.length) best = { group, item }
      }
    }
  }
  if (!best) return { title: 'Admin', crumbs }

  crumbs.push({ label: best.group.label })
  const isDetail = pathname !== best.item.to
  crumbs.push(isDetail ? { label: best.item.label, to: best.item.to } : { label: best.item.label })
  if (isDetail) crumbs.push({ label: 'Details' })
  return { title: isDetail ? `${best.item.label} · Details` : best.item.label, crumbs }
}
