import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Database,
  FileText,
  MessagesSquare,
  Quote,
  Clock,
  CornerDownLeft,
  ArrowRight,
  Plus,
  Upload,
  CreditCard,
  FlaskConical,
} from 'lucide-react'
import { useUI } from '../../lib/ui'
import { useLocalStorage } from '../../lib/hooks'
import { buildSearchIndex, type SearchDoc } from '../../lib/appData'

const CATEGORY_ICON = {
  'Knowledge Bases': Database,
  Documents: FileText,
  Conversations: MessagesSquare,
  Sources: Quote,
} as const

type QuickAction = { label: string; hint: string; to: string; icon: typeof Plus }

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'New chat', hint: 'Ctrl N', to: '/chat', icon: Plus },
  { label: 'Upload a document', hint: 'Ctrl U', to: '/documents', icon: Upload },
  { label: 'Open RAG Playground', hint: '', to: '/playground', icon: FlaskConical },
  { label: 'View billing & usage', hint: '', to: '/billing', icon: CreditCard },
]

export default function CommandPalette() {
  const { searchOpen, setSearchOpen } = useUI()
  const navigate = useNavigate()
  const index = useMemo(() => buildSearchIndex(), [])
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [recent, setRecent] = useLocalStorage<string[]>(
    'rag-starter.recent-searches',
    ['present perfect', 'architecture', 'chunk overlap'],
  )
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 20)
    }
  }, [searchOpen])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return [] as SearchDoc[]
    return index
      .filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.subtitle.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q),
      )
      .slice(0, 12)
  }, [index, query])

  const grouped = useMemo(() => {
    const map = new Map<string, SearchDoc[]>()
    for (const r of results) {
      const arr = map.get(r.category) ?? []
      arr.push(r)
      map.set(r.category, arr)
    }
    return [...map.entries()]
  }, [results])

  // Flat list for arrow navigation: quick actions first when empty, else results.
  const flat: { to: string; label: string }[] = query.trim()
    ? results.map((r) => ({ to: r.to, label: r.title }))
    : QUICK_ACTIONS.map((a) => ({ to: a.to, label: a.label }))

  function go(to: string, label?: string) {
    if (query.trim() && label) {
      setRecent((r) => [query.trim(), ...r.filter((x) => x !== query.trim())].slice(0, 6))
    }
    setSearchOpen(false)
    navigate(to)
  }

  if (!searchOpen) return null

  return (
    <div className="cmdk-scrim" onClick={() => setSearchOpen(false)}>
      <div
        className="cmdk"
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cmdk__input">
          <Search size={17} />
          <input
            ref={inputRef}
            placeholder="Search knowledge bases, documents, conversations…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(a + 1, flat.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              } else if (e.key === 'Enter' && flat[active]) {
                go(flat[active].to, flat[active].label)
              }
            }}
          />
          <kbd className="cmdk__esc">Esc</kbd>
        </div>

        <div className="cmdk__body scroll">
          {!query.trim() && (
            <>
              {recent.length > 0 && (
                <div className="cmdk__group">
                  <div className="cmdk__label">Recent searches</div>
                  {recent.map((r) => (
                    <button
                      key={r}
                      className="cmdk__row"
                      onClick={() => {
                        setQuery(r)
                        inputRef.current?.focus()
                      }}
                    >
                      <Clock size={15} />
                      <span className="cmdk__row-title">{r}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="cmdk__group">
                <div className="cmdk__label">Quick actions</div>
                {QUICK_ACTIONS.map((a, i) => (
                  <button
                    key={a.label}
                    className={`cmdk__row${active === i ? ' is-active' : ''}`}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(a.to)}
                  >
                    <a.icon size={15} />
                    <span className="cmdk__row-title">{a.label}</span>
                    {a.hint && <kbd>{a.hint}</kbd>}
                  </button>
                ))}
              </div>
            </>
          )}

          {query.trim() && grouped.length === 0 && (
            <div className="cmdk__empty">
              No matches for “{query.trim()}”. Try a document name or a topic.
            </div>
          )}

          {query.trim() &&
            grouped.map(([category, rows]) => {
              const Icon = CATEGORY_ICON[category as keyof typeof CATEGORY_ICON]
              return (
                <div className="cmdk__group" key={category}>
                  <div className="cmdk__label">{category}</div>
                  {rows.map((r) => {
                    const flatIdx = results.indexOf(r)
                    return (
                      <button
                        key={r.id}
                        className={`cmdk__row${active === flatIdx ? ' is-active' : ''}`}
                        onMouseEnter={() => setActive(flatIdx)}
                        onClick={() => go(r.to, r.title)}
                      >
                        <Icon size={15} />
                        <span className="cmdk__row-main">
                          <span className="cmdk__row-title">{r.title}</span>
                          <span className="cmdk__row-sub">{r.subtitle}</span>
                        </span>
                        <ArrowRight size={14} className="cmdk__row-go" />
                      </button>
                    )
                  })}
                </div>
              )
            })}
        </div>

        <div className="cmdk__foot">
          <span>
            <CornerDownLeft size={12} /> to select
          </span>
          <span>↑ ↓ to navigate</span>
          <span>
            <kbd>Ctrl</kbd> <kbd>K</kbd> to toggle
          </span>
        </div>
      </div>
    </div>
  )
}
