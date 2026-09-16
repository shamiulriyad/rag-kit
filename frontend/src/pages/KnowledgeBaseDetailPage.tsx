import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Database,
  Upload,
  MessagesSquare,
  FileText,
  Boxes,
  HardDrive,
  Star,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import StatusPill from '../components/ui/StatusPill'
import {
  ApiError,
  getKnowledgeBase,
  getKnowledgeBaseStats,
  listDocuments,
  listKnowledgeBaseMembers,
  type DocumentRecord,
  type KnowledgeBaseMember,
  type KnowledgeBaseStats,
  type KnowledgeBaseSummary,
} from '../services/api'
import { formatBytes, formatNumber, relativeTime } from '../lib/format'
import { useWorkspace } from '../lib/workspace'

const TABS = ['overview', 'documents', 'chat', 'members', 'settings'] as const
type Tab = (typeof TABS)[number]

function friendlyError(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback
}

export default function KnowledgeBaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { isKbStarred, toggleKb } = useWorkspace()

  const [kb, setKb] = useState<KnowledgeBaseSummary | null>(null)
  const [stats, setStats] = useState<KnowledgeBaseStats | null>(null)
  const [docs, setDocs] = useState<DocumentRecord[]>([])
  const [members, setMembers] = useState<KnowledgeBaseMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tabParam = params.get('tab') as Tab | null
  const [tab, setTab] = useState<Tab>(tabParam && TABS.includes(tabParam) ? tabParam : 'overview')

  function selectTab(next: Tab) {
    setTab(next)
    setParams(next === 'overview' ? {} : { tab: next }, { replace: true })
  }

  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    Promise.all([getKnowledgeBase(id), getKnowledgeBaseStats(id), listDocuments(id), listKnowledgeBaseMembers(id)])
      .then(([kbRes, statsRes, docsRes, membersRes]) => {
        setKb(kbRes)
        setStats(statsRes)
        setDocs(docsRes)
        setMembers(membersRes)
      })
      .catch((err) => setError(friendlyError(err, 'Could not load this Knowledge Base.')))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="page">
        <div className="state">
          <span className="spinner" />
        </div>
      </div>
    )
  }

  if (error || !kb) {
    return (
      <div className="page">
        <div className="state state--error">
          <span className="state__icon">
            <Database />
          </span>
          <h3>{error ? "Couldn't load this Knowledge Base" : 'Knowledge base not found'}</h3>
          <p className="muted">{error ?? 'It may have been deleted or you no longer have access.'}</p>
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
              {kb.description || 'No description yet.'}
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
            <div className="stat__value">{stats?.documentCount ?? kb.documents}</div>
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
            <div className="stat__value">{formatNumber(stats?.chunkCount ?? kb.chunks)}</div>
            <div className="stat__label">Chunks</div>
          </div>
        </div>
        <div className="card stat">
          <div className="stat__top">
            <span className="stat__icon">
              <HardDrive />
            </span>
          </div>
          <div>
            <div className="stat__value">{formatBytes(stats?.storageBytes ?? 0)}</div>
            <div className="stat__label">Storage used</div>
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
            <dd>{stats?.documentCount ?? kb.documents}</dd>
            <dt>Ready</dt>
            <dd>{stats?.completedDocuments ?? 0}</dd>
            <dt>Processing</dt>
            <dd>{stats?.processingDocuments ?? 0}</dd>
            <dt>Failed</dt>
            <dd>{stats?.failedDocuments ?? 0}</dd>
            <dt>Chunks indexed</dt>
            <dd>{formatNumber(stats?.chunkCount ?? kb.chunks)}</dd>
            <dt>Storage used</dt>
            <dd>{formatBytes(stats?.storageBytes ?? 0)}</dd>
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
            {members.map((m) => (
              <div className="list__row" key={m.id || m.userId}>
                <span className="avatar avatar--sm">
                  {(m.fullName || m.email).split(' ').map((p) => p[0]).slice(0, 2).join('')}
                </span>
                <span className="grow">{m.fullName || m.email}</span>
                <span className="list__meta">{m.role}</span>
              </div>
            ))}
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
