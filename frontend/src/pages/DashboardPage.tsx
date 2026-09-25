import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Boxes,
  MessageSquare,
  Upload,
  Sparkles,
  Settings2,
  ArrowUpRight,
  Database,
  Star,
  History,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import StatusPill from '../components/ui/StatusPill'
import PlanUsageCard from '../components/app/PlanUsageCard'
import CreateKbModal from '../components/app/CreateKbModal'
import { useToast } from '../components/ui/Toast'
import {
  createKnowledgeBase,
  getAnalyticsOverview,
  getHealthDetail,
  listChatSessions,
  listDocuments,
  listKnowledgeBases,
  type AnalyticsOverview,
  type ChatSessionSummary,
  type DocumentRecord,
  type KnowledgeBaseSummary,
} from '../services/api'
import { type ActivityType } from '../lib/appData'
import { formatNumber, relativeTime } from '../lib/format'
import { useWorkspace } from '../lib/workspace'
import { useActivity } from '../lib/activity'

const ACTIVITY_ICON: Record<ActivityType, LucideIcon> = {
  upload: Upload,
  kb_created: Database,
  conversation: MessageSquare,
  delete: FileText,
  settings: Settings2,
  prompt: FileText,
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { isKbStarred, toggleKb } = useWorkspace()
  const { entries, log } = useActivity()
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)
  const [createKbOpen, setCreateKbOpen] = useState(false)
  const [kbs, setKbs] = useState<KnowledgeBaseSummary[]>([])
  const [docs, setDocs] = useState<DocumentRecord[]>([])
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [health, setHealth] = useState<Record<string, string>>({})

  useEffect(() => {
    getHealthDetail()
      .then((h) => {
        setHealth(h)
        setApiOnline(true)
      })
      .catch(() => setApiOnline(false))
    getAnalyticsOverview().then(setOverview).catch(() => {})
    listChatSessions().then(setSessions).catch(() => {})
  }, [])

  useEffect(() => {
    listKnowledgeBases()
      .then(async (kbList) => {
        setKbs(kbList)
        const perKb = await Promise.all(kbList.map((kb) => listDocuments(kb.id)))
        setDocs(perKb.flat())
      })
      .catch(() => {
        /* Dashboard degrades gracefully to zeroed stats on failure. */
      })
  }, [])

  const totalChunks = overview?.totalChunks ?? docs.reduce((s, d) => s + (d.chunks ?? 0), 0)
  const recentSessions = [...sessions]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 4)
  const healthRows = [
    { key: 'api', name: 'ASP.NET Core API' },
    { key: 'database', name: 'Database' },
    { key: 'storage', name: 'File storage' },
    { key: 'rag', name: 'Python RAG service' },
    { key: 'qdrant', name: 'Qdrant vector store' },
    { key: 'llm', name: 'Gemini API' },
  ]
  const recentDocs = [...docs]
    .sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))
    .slice(0, 4)

  return (
    <div className="page">
      <div className="statgrid">
        <StatCard icon={FileText} value={String(overview?.totalDocuments ?? docs.length)} label="Documents indexed" />
        <StatCard icon={Boxes} value={formatNumber(totalChunks)} label="Chunks in Qdrant" />
        <StatCard
          icon={MessageSquare}
          value={formatNumber(overview?.totalQuestionsThisMonth ?? 0)}
          label="Questions this month"
        />
        <StatCard icon={Database} value={String(overview?.totalKnowledgeBases ?? kbs.length)} label="Knowledge Bases" />
      </div>

      <PlanUsageCard />

      <div className="grid-2">
        <section className="card">
          <div className="panel-head">
            <h3>Recent documents</h3>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => navigate('/documents')}
            >
              View all <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="list">
            {recentDocs.map((d) => (
              <div className="list__row" key={d.id}>
                <span className="list__icon">
                  <FileText />
                </span>
                <span className="grow truncate">{d.name}</span>
                <span className="list__meta">{d.chunks ?? 0} chunks</span>
                <StatusPill status={d.status} />
              </div>
            ))}
            {recentDocs.length === 0 && (
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                No documents uploaded yet.
              </p>
            )}
          </div>
        </section>

        <section className="card">
          <div className="panel-head">
            <h3>System health</h3>
            <StatusPill
              status="ok"
              label={
                apiOnline === null
                  ? 'Checking…'
                  : apiOnline
                    ? 'API reachable'
                    : 'API offline'
              }
            />
          </div>
          <div className="list">
            {healthRows.map((r) => {
              const state = health[r.key]
              const up = state === 'healthy'
              return (
                <div className="health__row" key={r.key}>
                  <div>
                    <div>{r.name}</div>
                    <div className="list__meta">{state ?? 'unknown'}</div>
                  </div>
                  <StatusPill status={up ? 'ok' : 'failed'} label={up ? undefined : 'Down'} />
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="panel-head">
            <h3>Recent conversations</h3>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => navigate('/chat')}
            >
              Open chat <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="list">
            {recentSessions.map((c) => (
              <div
                className="list__row"
                key={c.id}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/chat?conversation=${c.id}`)}
              >
                <span className="list__icon">
                  <MessageSquare />
                </span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="truncate" style={{ color: 'var(--text)' }}>
                    {c.title}
                  </div>
                  <div className="list__meta">
                    {c.knowledgeBaseName} · {c.messageCount} messages · {relativeTime(c.updatedAt)}
                  </div>
                </div>
              </div>
            ))}
            {recentSessions.length === 0 && (
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                No questions asked yet.
              </p>
            )}
          </div>
        </section>

        <section className="card">
          <div className="panel-head">
            <h3>Quick actions</h3>
          </div>
          <div className="quick">
            <button className="quick__btn" onClick={() => navigate('/documents')}>
              <Upload />
              <strong>Upload a PDF</strong>
              <span>Ingest a new document</span>
            </button>
            <button className="quick__btn" onClick={() => navigate('/chat')}>
              <Sparkles />
              <strong>Ask a question</strong>
              <span>Query your knowledge base</span>
            </button>
            <button className="quick__btn" onClick={() => navigate('/settings')}>
              <Settings2 />
              <strong>Tune retrieval</strong>
              <span>Chunk size, overlap, top-K</span>
            </button>
            <button className="quick__btn" onClick={() => setCreateKbOpen(true)}>
              <Database />
              <strong>Create Knowledge Base</strong>
              <span>Group documents together</span>
            </button>
          </div>
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="panel-head">
            <h3>Knowledge Bases</h3>
            <span className="muted" style={{ fontSize: '0.8rem' }}>
              {kbs.length} total
            </span>
          </div>
          <div className="list">
            {kbs.length === 0 && (
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                No Knowledge Bases yet.
              </p>
            )}
            {kbs.map((kb) => (
              <div
                className="list__row"
                key={kb.id}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/knowledge-bases/${kb.id}`)}
              >
                <span className="list__icon">
                  <Database />
                </span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="truncate" style={{ color: 'var(--text)' }}>
                    {kb.name}
                  </div>
                  <div className="list__meta">
                    {kb.documents} docs · {formatNumber(kb.chunks)} chunks ·{' '}
                    {relativeTime(kb.updatedAt)}
                  </div>
                </div>
                <button
                  className="starbtn"
                  aria-label={isKbStarred(kb.id) ? 'Unstar' : 'Star'}
                  aria-pressed={isKbStarred(kb.id)}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleKb(kb.id)
                  }}
                >
                  <Star size={15} fill={isKbStarred(kb.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="panel-head">
            <h3>Recent activity</h3>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => navigate('/activity')}
            >
              View all <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="list">
            {entries.slice(0, 6).map((e) => {
              const Icon = ACTIVITY_ICON[e.type] ?? History
              return (
                <div className="list__row" key={e.id}>
                  <span className="list__icon">
                    <Icon />
                  </span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="truncate">{e.text}</div>
                    <div className="list__meta">{relativeTime(e.at)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <CreateKbModal
        open={createKbOpen}
        onClose={() => setCreateKbOpen(false)}
        onCreate={async (name, description) => {
          const kb = await createKnowledgeBase(name, description)
          setKbs((k) => [kb, ...k])
          log('kb_created', `Created the ${name} Knowledge Base`)
          toast('ok', `Created "${name}". Manage it from Knowledge Bases.`)
        }}
      />
    </div>
  )
}
