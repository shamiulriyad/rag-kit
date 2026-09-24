import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MessagesSquare, Pencil, Trash2, ArrowUpRight, FileText, BookOpen } from 'lucide-react'
import {
  ApiError,
  deleteChatSession,
  listChatSessions,
  listDocuments,
  listKnowledgeBases,
  renameChatSession,
  type ChatSessionSummary,
  type DocumentRecord,
  type KnowledgeBaseSummary,
} from '../services/api'
import { relativeTime } from '../lib/format'
import { Select } from '../components/ui/Field'
import { useToast } from '../components/ui/Toast'

const errMsg = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback)

/** Chat history grouped by Knowledge Base. A Knowledge Base is a set of PDFs, so each
 *  conversation is filed under the documents it was asked against. */
export default function ChatHistoryPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [kbs, setKbs] = useState<KnowledgeBaseSummary[]>([])
  const [docsByKb, setDocsByKb] = useState<Record<string, DocumentRecord[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [kbFilter, setKbFilter] = useState('all')

  useEffect(() => {
    let cancelled = false
    Promise.all([listChatSessions(), listKnowledgeBases()])
      .then(async ([sessionList, kbList]) => {
        if (cancelled) return
        setSessions(sessionList)
        setKbs(kbList)
        const usedKbIds = [...new Set(sessionList.map((s) => s.knowledgeBaseId))]
        const docLists = await Promise.all(
          usedKbIds.map((id) => listDocuments(id).catch(() => [] as DocumentRecord[])),
        )
        if (cancelled) return
        setDocsByKb(Object.fromEntries(usedKbIds.map((id, i) => [id, docLists[i]])))
      })
      .catch((err) => {
        if (!cancelled) setError(errMsg(err, 'Could not load your chat history.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const byKb = new Map<string, ChatSessionSummary[]>()
    for (const s of sessions) {
      if (kbFilter !== 'all' && s.knowledgeBaseId !== kbFilter) continue
      const docNames = (docsByKb[s.knowledgeBaseId] ?? []).map((d) => d.name.toLowerCase())
      if (
        q &&
        !s.title.toLowerCase().includes(q) &&
        !s.knowledgeBaseName.toLowerCase().includes(q) &&
        !docNames.some((n) => n.includes(q))
      )
        continue
      byKb.set(s.knowledgeBaseId, [...(byKb.get(s.knowledgeBaseId) ?? []), s])
    }
    return [...byKb.entries()]
      .map(([kbId, list]) => ({
        kbId,
        name: list[0].knowledgeBaseName,
        list: [...list].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
      }))
      .sort((a, b) => +new Date(b.list[0].updatedAt) - +new Date(a.list[0].updatedAt))
  }, [sessions, docsByKb, query, kbFilter])

  async function rename(c: ChatSessionSummary) {
    const title = window.prompt('Rename conversation', c.title)
    if (!title?.trim() || title.trim() === c.title) return
    try {
      const updated = await renameChatSession(c.id, title.trim())
      setSessions((cs) =>
        cs.map((x) => (x.id === c.id ? { ...x, title: updated.title, updatedAt: updated.updatedAt } : x)),
      )
      toast('ok', 'Renamed.')
    } catch (err) {
      toast('err', errMsg(err, 'Could not rename this conversation.'))
    }
  }

  async function remove(c: ChatSessionSummary) {
    if (!window.confirm(`Delete "${c.title}"? This cannot be undone.`)) return
    try {
      await deleteChatSession(c.id)
      setSessions((cs) => cs.filter((x) => x.id !== c.id))
      toast('ok', 'Conversation deleted.')
    } catch (err) {
      toast('err', errMsg(err, 'Could not delete this conversation.'))
    }
  }

  if (loading)
    return (
      <div className="page">
        <p className="muted">Loading chat history…</p>
      </div>
    )
  if (error)
    return (
      <div className="page">
        <div className="state state--error">
          <h3>Something went wrong</h3>
          <p className="muted">{error}</p>
        </div>
      </div>
    )

  return (
    <div className="page">
      <div className="toolbar">
        <div className="search">
          <Search />
          <input
            className="input"
            placeholder="Search by title, knowledge base or PDF name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={kbFilter} onChange={(e) => setKbFilter(e.target.value)}>
          <option value="all">All knowledge bases</option>
          {kbs.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </Select>
      </div>

      {sessions.length === 0 ? (
        <div className="state">
          <span className="state__icon">
            <MessagesSquare />
          </span>
          <h3>No conversations yet</h3>
          <p className="muted">
            Ask a question in Knowledge Chat and it will be saved here, grouped by PDF collection.
          </p>
          <button className="btn btn--primary" onClick={() => navigate('/chat')}>
            Open Knowledge Chat
          </button>
        </div>
      ) : groups.length === 0 ? (
        <div className="state">
          <p className="muted">No conversations match your search.</p>
        </div>
      ) : (
        groups.map((g) => {
          const docs = docsByKb[g.kbId] ?? []
          return (
            <section className="card" key={g.kbId}>
              <div className="panel-head">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={16} /> {g.name}
                  <span className="list__meta">
                    {g.list.length} conversation{g.list.length === 1 ? '' : 's'}
                  </span>
                </h3>
              </div>
              {docs.length > 0 && (
                <div
                  className="list__meta"
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '0 var(--sp-4) var(--sp-3)' }}
                >
                  {docs.map((d) => (
                    <span key={d.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <FileText size={12} /> {d.name}
                    </span>
                  ))}
                </div>
              )}
              <div className="list">
                {g.list.map((c) => (
                  <div className="list__row" key={c.id}>
                    <span className="list__icon">
                      <MessagesSquare />
                    </span>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="truncate" style={{ color: 'var(--text)' }}>
                        {c.title}
                      </div>
                      <div className="list__meta">
                        {c.messageCount} messages · {relativeTime(c.updatedAt)}
                      </div>
                    </div>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => navigate(`/chat?conversation=${c.id}`)}
                    >
                      Continue <ArrowUpRight size={14} />
                    </button>
                    <button className="iconbtn" aria-label="Rename" onClick={() => rename(c)}>
                      <Pencil size={15} />
                    </button>
                    <button className="iconbtn" aria-label="Delete" onClick={() => remove(c)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
