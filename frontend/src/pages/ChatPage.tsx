import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import {
  ArrowUp,
  Copy,
  Check,
  FileText,
  MessagesSquare,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import { Select } from '../components/ui/Field'
import { Markdown } from '../lib/markdown'
import { askQuestion, type Source } from '../services/api'
import {
  mockDocuments,
  sampleAnswer,
  sampleSources,
  suggestedPrompts,
} from '../lib/mockData'

interface ChatTurn {
  id: string
  role: 'user' | 'ai'
  text: string
  sources?: Source[]
  error?: boolean
}

const readyDocs = mockDocuments.filter((d) => d.status === 'ready')

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

export default function ChatPage() {
  const [scope, setScope] = useState<string>('all')
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [turns, busy])

  function autoGrow() {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  async function send(text: string) {
    const q = text.trim()
    if (!q || busy) return
    setInput('')
    if (taRef.current) taRef.current.style.height = 'auto'

    const userTurn: ChatTurn = { id: `u${Date.now()}`, role: 'user', text: q }
    setTurns((t) => [...t, userTurn])
    setBusy(true)

    try {
      const res = await askQuestion(q, {
        documentId: scope === 'all' ? undefined : scope,
      })
      setTurns((t) => [
        ...t,
        { id: `a${Date.now()}`, role: 'ai', text: res.answer, sources: res.sources },
      ])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed'
      const unreachable = /reach the backend/i.test(message)
      if (unreachable) {
        // Offline demo answer so the interface stays explorable.
        setTurns((t) => [
          ...t,
          {
            id: `a${Date.now()}`,
            role: 'ai',
            text:
              sampleAnswer +
              '\n\n_(Demo response — the .NET API was unreachable, so this answer is not grounded in live retrieval.)_',
            sources: sampleSources,
          },
        ])
      } else {
        setTurns((t) => [
          ...t,
          { id: `a${Date.now()}`, role: 'ai', text: message, error: true },
        ])
      }
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
    <div className="chat">
      <div className="chat__bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileText size={16} className="muted" />
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            Scope
          </span>
          <Select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            style={{ width: 280 }}
          >
            <option value="all">All documents ({readyDocs.length})</option>
            {readyDocs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
        {!empty && (
          <button className="btn btn--ghost btn--sm" onClick={() => setTurns([])}>
            <RotateCcw size={14} />
            New conversation
          </button>
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
              Answers are generated by Gemini from the chunks retrieved out of
              Qdrant, and every response cites the document and page it used.
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
              <div
                key={turn.id}
                className={`msg msg--${turn.role === 'ai' ? 'ai' : 'user'}`}
              >
                <span className="msg__avatar">
                  {turn.role === 'ai' ? 'AI' : 'You'}
                </span>
                <div className="msg__body">
                  <div className="msg__role">
                    {turn.role === 'ai' ? 'RAG Starter' : 'You'}
                  </div>

                  {turn.error ? (
                    <div className="state state--error" style={{ margin: 0, alignItems: 'flex-start', textAlign: 'left' }}>
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
                      {turn.sources && turn.sources.length > 0 && (
                        <>
                          <div className="msg__role" style={{ marginTop: 'var(--sp-4)' }}>
                            Sources
                          </div>
                          <div className="sources-grid">
                            {turn.sources.map((s, i) => (
                              <SourceCard key={i} source={s} />
                            ))}
                          </div>
                        </>
                      )}
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
  )
}
