import { useEffect, useState } from 'react'
import { MessageSquare, FileText, Database as DatabaseIcon, HardDrive } from 'lucide-react'
import BarChart from '../components/app/charts/BarChart'
import {
  getAnalyticsOverview,
  getDocumentsOverTime,
  getQuestionsOverTime,
  getUsage,
  type AnalyticsOverview,
  type TimeSeriesPoint,
  type UsageSummary,
} from '../services/api'
import { formatBytes, formatNumber } from '../lib/format'

const dayKey = (d: Date) => d.toISOString().slice(0, 10)

/** The API may omit days with no activity - fill the gaps so the chart shows zeros. */
function lastDays(points: TimeSeriesPoint[], days: number) {
  const byDay = new Map(points.map((p) => [p.date.slice(0, 10), p.count]))
  const out: { date: Date; value: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push({ date: d, value: byDay.get(dayKey(d)) ?? 0 })
  }
  return out
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [questions, setQuestions] = useState<TimeSeriesPoint[]>([])
  const [documents, setDocuments] = useState<TimeSeriesPoint[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getAnalyticsOverview().then(setOverview),
      getUsage().then(setUsage),
      getQuestionsOverTime(7).then(setQuestions),
      getDocumentsOverTime(28).then(setDocuments),
    ])
      .catch(() => {})
      .finally(() => !cancelled && setLoaded(true))
    return () => {
      cancelled = true
    }
  }, [])

  const questionsChart = lastDays(questions, 7).map((p) => ({
    label: p.date.toLocaleDateString('en-US', { weekday: 'short' }),
    value: p.value,
  }))

  const docDays = lastDays(documents, 28)
  const documentsChart = [0, 1, 2, 3].map((w) => ({
    label: `Wk ${w + 1}`,
    value: docDays.slice(w * 7, w * 7 + 7).reduce((s, p) => s + p.value, 0),
  }))

  const usageByKb = (overview?.mostUsedKnowledgeBases ?? []).map((kb) => ({
    label: kb.name,
    value: kb.chunks,
  }))

  const stats = [
    { icon: MessageSquare, value: formatNumber(overview?.totalQuestionsThisMonth ?? 0), label: 'Questions this month' },
    { icon: FileText, value: String(overview?.totalDocuments ?? 0), label: 'Documents' },
    { icon: HardDrive, value: formatBytes(overview?.storageBytes ?? 0), label: 'Storage used' },
    { icon: DatabaseIcon, value: String(overview?.totalKnowledgeBases ?? 0), label: 'Knowledge Bases' },
  ]

  return (
    <div className="page">
      <div className="statgrid">
        {stats.map(({ icon: Icon, value, label }) => (
          <div className="card stat" key={label}>
            <div className="stat__top">
              <span className="stat__icon">
                <Icon />
              </span>
            </div>
            <div>
              <div className="stat__value">{value}</div>
              <div className="stat__label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {usage && usage.planCode.toLowerCase() === 'free' && (
        <div className="usage-chip">
          <b>
            {usage.questionsThisMonth} / {usage.maxQuestionsPerMonth}
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
          <BarChart data={questionsChart} />
        </section>

        <section className="card">
          <div className="panel-head">
            <h3>Documents added</h3>
            <span className="muted" style={{ fontSize: '0.78rem' }}>
              Last 4 weeks
            </span>
          </div>
          <BarChart data={documentsChart} />
        </section>
      </div>

      <section className="card">
        <div className="panel-head">
          <h3>Knowledge Bases</h3>
          <span className="muted" style={{ fontSize: '0.78rem' }}>
            Chunks indexed
          </span>
        </div>
        {loaded && usageByKb.length === 0 ? (
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            No Knowledge Bases yet.
          </p>
        ) : (
          <BarChart data={usageByKb} height={160} />
        )}
      </section>
    </div>
  )
}
