import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Boxes,
  MessageSquare,
  Quote,
  Upload,
  Sparkles,
  Settings2,
  FlaskConical,
  ArrowUpRight,
  Database,
  Star,
  History,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import StatusPill from '../components/ui/StatusPill'
import PlanUsageCard from '../components/app/PlanUsageCard'
import { checkHealth } from '../services/api'
import {
  mockDocuments,
  mockQuestions,
  systemHealth,
} from '../lib/mockData'
import { mockKnowledgeBases, type ActivityType } from '../lib/appData'
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
  const { isKbStarred, toggleKb } = useWorkspace()
  const { entries } = useActivity()
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)

  useEffect(() => {
    checkHealth()
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false))
  }, [])

  const totalChunks = mockDocuments.reduce((s, d) => s + d.chunks, 0)
  const totalSources = mockQuestions.reduce((s, q) => s + q.sources, 0)
  const recentDocs = [...mockDocuments]
    .sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))
    .slice(0, 4)

  return (
    <div className="page">
      <div className="statgrid">
        <StatCard
          icon={FileText}
          value={String(mockDocuments.length)}
          label="Documents indexed"
          delta={{ text: '+2 this week', trend: 'up' }}
        />
        <StatCard
          icon={Boxes}
          value={formatNumber(totalChunks)}
          label="Chunks in Qdrant"
          delta={{ text: '+486 this week', trend: 'up' }}
        />
        <StatCard
          icon={MessageSquare}
          value="128"
          label="Questions asked"
          delta={{ text: '+31 this week', trend: 'up' }}
        />
        <StatCard
          icon={Quote}
          value={String(totalSources * 34)}
          label="Sources cited"
          delta={{ text: 'stable', trend: 'flat' }}
        />
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
                <span className="list__meta">{d.chunks} chunks</span>
                <StatusPill status={d.status} />
              </div>
            ))}
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
                    : 'API offline · demo data'
              }
            />
          </div>
          <div className="list">
            {systemHealth.map((s) => (
              <div className="health__row" key={s.name}>
                <div>
                  <div>{s.name}</div>
                  <div className="list__meta">{s.detail}</div>
                </div>
                <StatusPill status="ok" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="panel-head">
            <h3>Recent questions</h3>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => navigate('/chat')}
            >
              Open chat <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="list">
            {mockQuestions.map((q) => (
              <div className="list__row" key={q.id}>
                <span className="list__icon">
                  <MessageSquare />
                </span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="truncate" style={{ color: 'var(--text)' }}>
                    {q.question}
                  </div>
                  <div className="list__meta">
                    {q.document} · {q.sources} sources · {relativeTime(q.askedAt)}
                  </div>
                </div>
              </div>
            ))}
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
            <button className="quick__btn" onClick={() => navigate('/playground')}>
              <FlaskConical />
              <strong>Open Playground</strong>
              <span>Experiment with retrieval</span>
            </button>
          </div>
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="panel-head">
            <h3>Knowledge Bases</h3>
            <span className="muted" style={{ fontSize: '0.8rem' }}>
              {mockKnowledgeBases.length} total
            </span>
          </div>
          <div className="list">
            {mockKnowledgeBases.map((kb) => (
              <div className="list__row" key={kb.id}>
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
                  onClick={() => toggleKb(kb.id)}
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
    </div>
  )
}
