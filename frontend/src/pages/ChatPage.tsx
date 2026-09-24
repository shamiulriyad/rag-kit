import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowUp,
  Copy,
  Check,
  FileText,
  MessagesSquare,
  AlertTriangle,
  RotateCcw,
  Pin,
  Plus,
} from 'lucide-react'
import { Select } from '../components/ui/Field'
import { Markdown } from '../lib/markdown'
import {
  ApiError,
  askInSession,
  createChatSession,
  getChatSession,
  listChatSessions,
  listKnowledgeBases,
  type ChatSessionSummary,
  type ChatSourceDto,
  type KnowledgeBaseSummary,
  type Source,
} from '../services/api'
import { suggestedPrompts } from '../lib/mockData'
import { relativeTime } from '../lib/format'
import { useActivity } from '../lib/activity'
import { useWorkspace } from '../lib/workspace'

interface ChatTurn {
  id: string
  role: 'user' | 'ai'
  text: string
  sources?: Source[]
  error?: boolean
}

function SourceCard({ source }: { source: Source }) {
  const pct = Math.round((source.score ?? 0) * 100)
  return (
    <div className="source-card">
      <div className="source-card__top">
        <FileText />
        <span className="truncate">{source.document}</span>
      </div>
      <div className="source-card__meta">
        <span>{source.page != null ? `Page ${source.page}` : 'Whole document'}</span>
        <span>{pct}% match</span>
      </div>
      <div className="score-bar">
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="btn btn--ghost btn--sm"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        })
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied' : 'Copy answer'}
    </button>
  )
}

const toSource = (s: ChatSourceDto): Source => ({
  document: s.documentName ?? 'document',
  page: s.page,
  score: s.relevanceScore,
})

export default function ChatPage() {
  const { log } = useActivity()
  const { togglePin, isPinned } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const [kbs, setKbs] = useState<KnowledgeBaseSummary[]>([])
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [kbScope, setKbScope] = useState<string>(params.get('kb') ?? '')
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [convId, setConvId] = useState<string | null>(null)
  const [continuing, setContinuing] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const firstQuestion = turns.find((t) => t.role === 'user')?.text ?? ''

  const lastAiTurn = [...turns].reverse().find((t) => t.role === 'ai' && !t.error)

  useEffect(() => {
    let cancelled = false
    Promise.all([listKnowledgeBases(), listChatSessions()])
      .then(([kbList, sessionList]) => {
        if (cancelled) return
        setKbs(kbList)
        setSessions(sessionList)
        setKbScope((cur) => (cur && kbList.some((k) => k.id === cur) ? cur : (kbList[0]?.id ?? '')))
        const convParam = params.get('conversation')
        const conv = convParam ? sessionList.find((c) => c.id === convParam) : undefined
        if (conv) openSession(conv)
      })
      .catch(() => {
        // Not signed in / API down - the composer reports the error when a question is sent.
      })
    return () => {
      cancelled = true
    }
    // Only load once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openSession(c: ChatSessionSummary) {
    setKbScope(c.knowledgeBaseId)
    setConvId(c.id)
    setContinuing(c.title)
    try {
      const { messages } = await getChatSession(c.id)
      setTurns(
        messages.map((m) => ({
          id: m.id,
          role: m.role.toLowerCase() === 'user' ? 'user' : 'ai',
          text: m.content,
          sources: m.sources.map(toSource),
        })),
      )
    } catch {
      setTurns([])
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, busy])

  function autoGrow() {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  function newConversation() {
    setTurns([])
    setConvId(null)
    setContinuing(null)
    setParams({}, { replace: true })
  }

  async function send(text: string) {
    const q = text.trim()
    if (!q || busy) return
    setInput('')
    if (taRef.current) taRef.current.style.height = 'auto'

    if (!kbScope) {
      setTurns((t) => [
        ...t,
        { id: `a${Date.now()}`, role: 'ai', text: 'Create a Knowledge Base and upload a PDF first.', error: true },
      ])
      return
    }

    const userTurn: ChatTurn = { id: `u${Date.now()}`, role: 'user', text: q }
    setTurns((t) => [...t, userTurn])
    setBusy(true)

    try {
      let sessionId = convId
      if (!sessionId) {
        const created = await createChatSession(kbScope)
        sessionId = created.id
        setConvId(sessionId)
        log('conversation', `Started a conversation: "${q.slice(0, 60)}${q.length > 60 ? '…' : ''}"`)
      }
      const res = await askInSession(sessionId, q)
      setTurns((t) => [
        ...t,
        { id: res.messageId, role: 'ai', text: res.answer, sources: res.sources.map(toSource) },
      ])
      listChatSessions().then(setSessions).catch(() => {})
    } catch (err) {
      const message = err instanceof ApiError || err instanceof Error ? err.message : 'Request failed'
      setTurns((t) => [...t, { id: `a${Date.now()}`, role: 'ai', text: message, error: true }])
    } finally {
      setBusy(false)
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const empty = turns.length === 0

  return (
    <div className="chatlayout">
      <aside className="chatlayout__side scroll">
        <div className="chatlayout__side-head">Knowledge Base</div>
        <Select
          value={kbScope}
          onChange={(e) => {
            setKbScope(e.target.value)
            newConversation()
          }}
        >
          {kbs.length === 0 && <option value="">No knowledge bases yet</option>}
          {kbs.map((kb) => (
            <option key={kb.id} value={kb.id}>
              {kb.name}
            </option>
          ))}
        </Select>

        <button className="btn btn--secondary" style={{ marginTop: 'var(--sp-3)' }} onClick={newConversation}>
          <Plus size={15} />
          New conversation
        </button>

        <div className="chatlayout__side-head" style={{ marginTop: 'var(--sp-5)' }}>
          Conversations
        </div>
        <div className="convlist">
          {sessions
            .filter((c) => c.knowledgeBaseId === kbScope)
            .map((c) => (
              <button
                key={c.id}
                className={`convlist__item${convId === c.id ? ' is-active' : ''}`}
                onClick={() => openSession(c)}
              >
                <MessagesSquare size={14} />
                <span className="truncate">{c.title}</span>
                <span className="list__meta">{relativeTime(c.updatedAt)}</span>
              </button>
            ))}
        </div>
      </aside>

      <div className="chat">
        <div className="chat__bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span className="truncate" style={{ fontWeight: 600 }}>
              {continuing ? `Continuing: ${continuing}` : (kbs.find((k) => k.id === kbScope)?.name ?? 'Knowledge Base')}
            </span>
          </div>
          {!empty && (
            <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
              <button
                className={`btn btn--ghost btn--sm${convId && isPinned(convId) ? ' is-on' : ''}`}
                onClick={() =>
                  convId &&
                  togglePin({
                    id: convId,
                    title: firstQuestion.slice(0, 60) + (firstQuestion.length > 60 ? '…' : ''),
                  })
                }
              >
                <Pin size={14} />
                {convId && isPinned(convId) ? 'Pinned' : 'Pin'}
              </button>
              <button className="btn btn--ghost btn--sm" onClick={newConversation}>
                <RotateCcw size={14} />
                New conversation
              </button>
            </div>
          )}
        </div>

        <div className="chat__scroll scroll" ref={scrollRef}>
          {empty ? (
            <div className="state">
              <span className="state__icon">
                <MessagesSquare />
              </span>
              <h3>Ask anything about your documents</h3>
              <p className="muted">
                Answers are generated by Gemini from the chunks retrieved out of Qdrant, and
                every response cites the document and page it used.
              </p>
              <div className="state__prompts">
                {suggestedPrompts.map((p) => (
                  <button key={p} onClick={() => send(p)}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="chat__thread">
              {turns.map((turn) => (
                <div key={turn.id} className={`msg msg--${turn.role === 'ai' ? 'ai' : 'user'}`}>
                  <span className="msg__avatar">{turn.role === 'ai' ? 'AI' : 'You'}</span>
                  <div className="msg__body">
                    <div className="msg__role">{turn.role === 'ai' ? 'RAG Starter' : 'You'}</div>

                    {turn.error ? (
                      <div
                        className="state state--error"
                        style={{ margin: 0, alignItems: 'flex-start', textAlign: 'left' }}
                      >
                        <span className="state__icon">
                          <AlertTriangle />
                        </span>
                        <div>
                          <h3>That request failed</h3>
                          <p className="muted">{turn.text}</p>
                        </div>
                      </div>
                    ) : turn.role === 'ai' ? (
                      <>
                        <Markdown content={turn.text} />
                        <div className="msg__actions">
                          <CopyButton text={turn.text} />
                        </div>
                      </>
                    ) : (
                      <div className="msg__text">{turn.text}</div>
                    )}
                  </div>
                </div>
              ))}

              {busy && (
                <div className="msg msg--ai">
                  <span className="msg__avatar">AI</span>
                  <div className="msg__body">
                    <div className="msg__role">RAG Starter</div>
                    <span className="typing" aria-label="Generating answer">
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="chat__composer">
          <div className="composer">
            <textarea
              ref={taRef}
              rows={1}
              placeholder="Ask a question about your documents…"
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                autoGrow()
              }}
              onKeyDown={onKeyDown}
            />
            <button
              className="btn btn--primary btn--sm"
              disabled={!input.trim() || busy}
              onClick={() => send(input)}
              aria-label="Send"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>

      <aside className="chatlayout__sources scroll">
        <div className="chatlayout__side-head">Sources</div>
        {!lastAiTurn || !lastAiTurn.sources || lastAiTurn.sources.length === 0 ? (
          <div className="state" style={{ margin: 'var(--sp-4) 0' }}>
            <span className="state__icon">
              <FileText />
            </span>
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              Sources for the latest answer will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {lastAiTurn.sources.map((s, i) => (
              <SourceCard key={i} source={s} />
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}
