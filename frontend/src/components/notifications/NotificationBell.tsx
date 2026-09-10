import { useState } from 'react'
import {
  Bell,
  CheckCheck,
  X,
  FileCheck2,
  FileWarning,
  Database,
  TriangleAlert,
  Sparkles,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNotifications } from '../../lib/notifications'
import { useDismiss } from '../../lib/hooks'
import { relativeTime } from '../../lib/format'
import type { NotificationType } from '../../lib/appData'

const ICON: Record<NotificationType, LucideIcon> = {
  doc_ready: FileCheck2,
  doc_failed: FileWarning,
  kb_created: Database,
  usage_warning: TriangleAlert,
  plan_reminder: Sparkles,
  team_activity: Users,
}

const TONE: Record<NotificationType, string> = {
  doc_ready: 'ok',
  doc_failed: 'bad',
  kb_created: 'accent',
  usage_warning: 'warn',
  plan_reminder: 'primary',
  team_activity: 'accent',
}

export default function NotificationBell() {
  const { items, unread, markRead, markAllRead, remove, clearAll } =
    useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false))

  return (
    <div className="popover" ref={ref}>
      <button
        className="iconbtn"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={17} />
        {unread > 0 && <span className="iconbtn__dot" />}
      </button>

      {open && (
        <div className="popover__panel notif" role="menu">
          <div className="popover__head">
            <strong>Notifications</strong>
            <div className="popover__head-actions">
              <button
                className="btn btn--ghost btn--sm"
                disabled={unread === 0}
                onClick={markAllRead}
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            </div>
          </div>

          <div className="notif__list scroll">
            {items.length === 0 && (
              <div className="popover__empty">
                <Bell size={22} />
                <p>You're all caught up.</p>
              </div>
            )}
            {items.map((n) => {
              const Icon = ICON[n.type]
              return (
                <div
                  key={n.id}
                  className={`notif__item${n.read ? '' : ' is-unread'}`}
                  onClick={() => markRead(n.id)}
                >
                  <span className={`notif__icon notif__icon--${TONE[n.type]}`}>
                    <Icon size={15} />
                  </span>
                  <div className="notif__body">
                    <div className="notif__title">{n.title}</div>
                    <div className="notif__text">{n.body}</div>
                    <div className="notif__time">{relativeTime(n.createdAt)}</div>
                  </div>
                  <button
                    className="notif__dismiss"
                    aria-label="Clear notification"
                    onClick={(e) => {
                      e.stopPropagation()
                      remove(n.id)
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              )
            })}
          </div>

          {items.length > 0 && (
            <div className="popover__foot">
              <button className="btn btn--ghost btn--sm" onClick={clearAll}>
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
