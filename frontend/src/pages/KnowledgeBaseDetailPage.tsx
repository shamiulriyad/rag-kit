import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Database,
  Upload,
  MessagesSquare,
  FileText,
  Boxes,
  MessageSquare,
  Star,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import StatusPill from '../components/ui/StatusPill'
import { mockKnowledgeBases } from '../lib/appData'
import { mockDocuments } from '../lib/mockData'
import { mockTeam } from '../lib/appData'
import { formatBytes, formatNumber, relativeTime } from '../lib/format'
import { useWorkspace } from '../lib/workspace'

const TABS = ['overview', 'documents', 'chat', 'members', 'settings'] as const
type Tab = (typeof TABS)[number]

export default function KnowledgeBaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { isKbStarred, toggleKb } = useWorkspace()

  const kb = useMemo(() => mockKnowledgeBases.find((k) => k.id === id), [id])
  const docs = useMemo(() => mockDocuments.filter((d) => d.knowledgeBaseId === id), [id])

  const tabParam = params.get('tab') as Tab | null
  const [tab, setTab] = useState<Tab>(tabParam && TABS.includes(tabParam) ? tabParam : 'overview')

  function selectTab(next: Tab) {
    setTab(next)
    setParams(next === 'overview' ? {} : { tab: next }, { replace: true })
  }

  if (!kb) {
    return (
      <div className="page">
        <div className="state">
          <span className="state__icon">
            <Database />
          </span>
          <h3>Knowledge base not found</h3>
          <p className="muted">It may have been deleted or renamed.</p>
          <Button variant="secondary" onClick={() => navigate('/knowledge-bases')}>
            Back to Knowledge Bases
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <button className="btn btn--ghost btn--sm" onClick={() => navigate('/knowledge-bases')}>
        <ArrowLeft size={14} />
        Knowledge Bases
      </button>

      <div className="toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <span className="list__icon">
            <Database />
          </span>
          <div>
            <h3 style={{ margin: 0 }}>{kb.name}</h3>
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              {kb.description}
            </p>
          </div>
          <button
            className="starbtn"
            aria-label={isKbStarred(kb.id) ? 'Unstar' : 'Star'}
            aria-pressed={isKbStarred(kb.id)}
            onClick={() => toggleKb(kb.id)}
          >
            <Star size={15} fill={isKbStarred(kb.id) ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
          <Button variant="secondary" onClick={() => navigate(`/documents?kb=${kb.id}`)}>
            <Upload size={15} />
            Upload Document
          </Button>
          <Button onClick={() => navigate(`/chat?kb=${kb.id}`)}>
            <MessagesSquare size={15} />
            Open Knowledge Chat
          </Button>
        </div>
      </div>

      <div className="statgrid">
        <div className="card stat">
          <div className="stat__top">
            <span className="stat__icon">
              <FileText />
            </span>
          </div>
          <div>
            <div className="stat__value">{docs.length}</div>
            <div className="stat__label">Documents</div>
          </div>
        </div>
        <div className="card stat">
          <div className="stat__top">
            <span className="stat__icon">
              <Boxes />
            </span>
          </div>
          <div>
            <div className="stat__value">{formatNumber(kb.chunks)}</div>
            <div className="stat__label">Chunks</div>
          </div>
        </div>
        <div className="card stat">
          <div className="stat__top">
            <span className="stat__icon">
              <MessageSquare />
            </span>
          </div>
          <div>
            <div className="stat__value">{formatNumber(kb.questions)}</div>
            <div className="stat__label">Questions</div>
          </div>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`tabs__btn${tab === t ? ' is-active' : ''}`}
            onClick={() => selectTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <section className="card">
          <div className="panel-head">
            <h3>Overview</h3>
          </div>
          <dl className="kv">
            <dt>Knowledge Base ID</dt>
            <dd className="mono">{kb.id}</dd>
            <dt>Documents</dt>
            <dd>{docs.length}</dd>
            <dt>Chunks indexed</dt>
            <dd>{formatNumber(kb.chunks)}</dd>
            <dt>Questions asked</dt>
            <dd>{formatNumber(kb.questions)}</dd>
            <dt>Last updated</dt>
            <dd>{relativeTime(kb.updatedAt)}</dd>
          </dl>
        </section>
      )}

      {tab === 'documents' && (
        <section className="card">
          <div className="panel-head">
            <h3>Documents</h3>
            <Button variant="ghost" onClick={() => navigate(`/documents?kb=${kb.id}`)}>
              Manage in Documents
            </Button>
          </div>
          {docs.length === 0 ? (
            <div className="state">
              <span className="state__icon">
                <FileText />
              </span>
              <h3>No documents yet</h3>
              <p className="muted">Upload a PDF to start building this knowledge base.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Size</th>
                    <th>Pages</th>
                    <th>Chunks</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id}>
                      <td className="truncate">{d.name}</td>
                      <td>{formatBytes(d.sizeBytes)}</td>
                      <td>{d.pages || '—'}</td>
                      <td>{d.chunks || '—'}</td>
                      <td>
                        <StatusPill status={d.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'chat' && (
        <section className="card">
          <div className="panel-head">
            <h3>Chat</h3>
          </div>
          <div className="state">
            <span className="state__icon">
              <MessagesSquare />
            </span>
            <h3>Ask questions scoped to {kb.name}</h3>
            <p className="muted">Open Knowledge Chat to start a conversation against this knowledge base.</p>
            <Button onClick={() => navigate(`/chat?kb=${kb.id}`)}>Open Knowledge Chat</Button>
          </div>
        </section>
      )}

      {tab === 'members' && (
        <section className="card">
          <div className="panel-head">
            <h3>Members</h3>
          </div>
          <div className="list">
            {kb.members.map((name) => {
              const member = mockTeam.members.find((m) => m.name === name)
              return (
                <div className="list__row" key={name}>
                  <span className="avatar avatar--sm">
                    {name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                  </span>
                  <span className="grow">{name}</span>
                  <span className="list__meta">{member?.role ?? 'Member'}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {tab === 'settings' && (
        <section className="card">
          <div className="panel-head">
            <h3>Settings</h3>
          </div>
          <p className="muted">
            Per-knowledge-base RAG configuration (chunking, retrieval, embedding model) lives in{' '}
            <button className="btn btn--ghost btn--sm" onClick={() => navigate('/settings?tab=rag')}>
              Settings → RAG Configuration
            </button>{' '}
            for now. Per-KB overrides are <strong>Coming Soon</strong>.
          </p>
        </section>
      )}
    </div>
  )
}
