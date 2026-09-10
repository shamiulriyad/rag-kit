import { useMemo } from 'react'
import {
  Upload,
  Database,
  MessagesSquare,
  Trash2,
  Settings2,
  FileText,
  History,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useActivity } from '../lib/activity'
import { useToast } from '../components/ui/Toast'
import type { ActivityType } from '../lib/appData'
import { relativeTime } from '../lib/format'

const ICON: Record<ActivityType, LucideIcon> = {
  upload: Upload,
  kb_created: Database,
  conversation: MessagesSquare,
  delete: Trash2,
  settings: Settings2,
  prompt: FileText,
}

function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yest = new Date()
  yest.setDate(today.getDate() - 1)
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (same(d, today)) return 'Today'
  if (same(d, yest)) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

export default function ActivityPage() {
  const { entries, clear } = useActivity()
  const toast = useToast()

  const groups = useMemo(() => {
    const map = new Map<string, typeof entries>()
    for (const e of entries) {
      const key = dayLabel(e.at)
      const arr = map.get(key) ?? []
      arr.push(e)
      map.set(key, arr)
    }
    return [...map.entries()]
  }, [entries])

  return (
    <div className="page">
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <p className="muted" style={{ fontSize: '0.86rem' }}>
          A timeline of what happened in your workspace. Stored locally for now;
          a backend would stream real events here.
        </p>
        {entries.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              clear()
              toast('ok', 'Activity log cleared.')
            }}
          >
            Clear log
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="state">
          <span className="state__icon">
            <History />
          </span>
          <h3>No activity yet</h3>
          <p className="muted">
            Upload a document or ask a question and it will show up here.
          </p>
        </div>
      ) : (
        <div className="timeline">
          {groups.map(([label, items]) => (
            <div className="timeline__day" key={label}>
              <div className="timeline__date">{label}</div>
              {items.map((e) => {
                const Icon = ICON[e.type]
                return (
                  <div className="timeline__row" key={e.id}>
                    <span className="timeline__dot">
                      <Icon size={14} />
                    </span>
                    <div className="timeline__content">
                      <span>{e.text}</span>
                      <span className="timeline__time">{relativeTime(e.at)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
