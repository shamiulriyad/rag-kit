import { MessageSquare, FileText, Database as DatabaseIcon, HardDrive, Info } from 'lucide-react'
import BarChart from '../components/app/charts/BarChart'
import { mockKnowledgeBases } from '../lib/appData'
import { mockDocuments, questionsThisMonth } from '../lib/mockData'
import { usePlan } from '../lib/plan'
import { formatBytes, formatNumber } from '../lib/format'

// Deterministic demo series — a real backend would return this from usage logs.
const QUESTIONS_OVER_TIME = [
  { label: 'Mon', value: 12 },
  { label: 'Tue', value: 18 },
  { label: 'Wed', value: 9 },
  { label: 'Thu', value: 22 },
  { label: 'Fri', value: 15 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 11 },
]

const DOCUMENTS_ADDED = [
  { label: 'Wk 1', value: 1 },
  { label: 'Wk 2', value: 0 },
  { label: 'Wk 3', value: 2 },
  { label: 'Wk 4', value: 0 },
]

export default function AnalyticsPage() {
  const { limits, isFree } = usePlan()
  const usageByKb = mockKnowledgeBases.map((kb) => ({ label: kb.name, value: kb.questions }))
  const storageUsed = mockDocuments.reduce((s, d) => s + d.sizeBytes, 0)

  return (
    <div className="page">
      <div className="secret-note">
        <Info />
        <span>
          Analytics shown here are demo data derived from the mock workspace, not live usage
          logs. Connect the real backend to replace these numbers.
        </span>
      </div>

      <div className="statgrid">
        <div className="card stat">
          <div className="stat__top">
            <span className="stat__icon">
              <MessageSquare />
            </span>
          </div>
          <div>
            <div className="stat__value">{formatNumber(questionsThisMonth)}</div>
            <div className="stat__label">Questions this month</div>
          </div>
        </div>
        <div className="card stat">
          <div className="stat__top">
            <span className="stat__icon">
              <FileText />
            </span>
          </div>
          <div>
            <div className="stat__value">{mockDocuments.length}</div>
            <div className="stat__label">Documents</div>
          </div>
        </div>
        <div className="card stat">
          <div className="stat__top">
            <span className="stat__icon">
              <HardDrive />
            </span>
          </div>
          <div>
            <div className="stat__value">{formatBytes(storageUsed)}</div>
            <div className="stat__label">Storage used</div>
          </div>
        </div>
        <div className="card stat">
          <div className="stat__top">
            <span className="stat__icon">
              <DatabaseIcon />
            </span>
          </div>
          <div>
            <div className="stat__value">{mockKnowledgeBases.length}</div>
            <div className="stat__label">Knowledge Bases</div>
          </div>
        </div>
      </div>

      {isFree && (
        <div className="usage-chip">
          <b>
            {questionsThisMonth} / {limits.questionsPerMonth}
          </b>{' '}
          questions used this month · Free plan
        </div>
      )}

      <div className="grid-2">
        <section className="card">
          <div className="panel-head">
            <h3>Questions over time</h3>
            <span className="muted" style={{ fontSize: '0.78rem' }}>
              Last 7 days
            </span>
          </div>
          <BarChart data={QUESTIONS_OVER_TIME} />
        </section>

        <section className="card">
          <div className="panel-head">
            <h3>Documents added</h3>
            <span className="muted" style={{ fontSize: '0.78rem' }}>
              This month
            </span>
          </div>
          <BarChart data={DOCUMENTS_ADDED} />
        </section>
      </div>

      <section className="card">
        <div className="panel-head">
          <h3>Usage by Knowledge Base</h3>
          <span className="muted" style={{ fontSize: '0.78rem' }}>
            Questions asked
          </span>
        </div>
        <BarChart data={usageByKb} height={160} />
      </section>
    </div>
  )
}
