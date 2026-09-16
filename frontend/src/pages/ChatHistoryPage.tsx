import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MessagesSquare, Pencil, Trash2, ArrowUpRight } from 'lucide-react'
import { mockConversations, type Conversation } from '../lib/appData'
import { relativeTime, dateBucket, type DateBucket } from '../lib/format'
import { useToast } from '../components/ui/Toast'

const BUCKET_ORDER: DateBucket[] = ['Today', 'Yesterday', 'Previous 7 days', 'Older']

export default function ChatHistoryPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(
      (c) => c.title.toLowerCase().includes(q) || c.knowledgeBase.toLowerCase().includes(q),
    )
  }, [conversations, query])

  const grouped = useMemo(() => {
    const groups: Record<DateBucket, Conversation[]> = {
      Today: [],
      Yesterday: [],
      'Previous 7 days': [],
      Older: [],
    }
    for (const c of [...filtered].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))) {
      groups[dateBucket(c.updatedAt)].push(c)
    }
    return groups
  }, [filtered])

  function rename(c: Conversation) {
    const title = window.prompt('Rename conversation', c.title)
    if (!title?.trim() || title.trim() === c.title) return
    setConversations((cs) => cs.map((x) => (x.id === c.id ? { ...x, title: title.trim() } : x)))
    toast('ok', 'Renamed.')
  }

  function remove(c: Conversation) {
    if (!window.confirm(`Delete "${c.title}"? This cannot be undone.`)) return
    setConversations((cs) => cs.filter((x) => x.id !== c.id))
    toast('ok', 'Conversation deleted.')
  }

  const isEmpty = conversations.length === 0

  return (
    <div className="page">
      <div className="toolbar">
        <div className="search">
          <Search />
          <input
            className="input"
            placeholder="Search conversations…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {isEmpty ? (
        <div className="state">
          <span className="state__icon">
            <MessagesSquare />
          </span>
          <h3>No conversations yet</h3>
          <p className="muted">Start a conversation in Knowledge Chat and it will show up here.</p>
        </div>
      ) : (
        BUCKET_ORDER.map((bucket) =>
          grouped[bucket].length === 0 ? null : (
            <section className="card" key={bucket}>
              <div className="panel-head">
                <h3>{bucket}</h3>
              </div>
              <div className="list">
                {grouped[bucket].map((c) => (
                  <div className="list__row" key={c.id}>
                    <span className="list__icon">
                      <MessagesSquare />
                    </span>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="truncate" style={{ color: 'var(--text)' }}>
                        {c.title}
                      </div>
                      <div className="list__meta">
                        {c.knowledgeBase} · {c.messages} messages · {relativeTime(c.updatedAt)}
                      </div>
                    </div>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => navigate(`/chat?conversation=${c.id}`)}
                    >
                      Continue <ArrowUpRight size={14} />
                    </button>
                    <button
                      className="iconbtn"
                      aria-label="Rename"
                      onClick={() => rename(c)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="iconbtn"
                      aria-label="Delete"
                      onClick={() => remove(c)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ),
        )
      )}
    </div>
  )
}
