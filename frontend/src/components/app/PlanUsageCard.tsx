import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Zap, Users } from 'lucide-react'
import { Button } from '../ui/Button'
import { PLANS, type PlanId } from '../../lib/plan'
import { getUsage, type UsageSummary } from '../../services/api'
import { formatBytes, formatNumber } from '../../lib/format'

interface Meter {
  label: string
  used: number
  total: number
  render: (n: number) => string
}

export default function PlanUsageCard() {
  const navigate = useNavigate()
  const [usage, setUsage] = useState<UsageSummary | null>(null)

  useEffect(() => {
    let cancelled = false
    getUsage()
      .then((u) => !cancelled && setUsage(u))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const code = (usage?.planCode ?? 'free').toLowerCase()
  const plan: PlanId = code === 'pro' || code === 'team' ? code : 'free'
  const isFree = plan === 'free'
  const PlanIcon = plan === 'pro' ? Zap : plan === 'team' ? Users : Sparkles
  const lim = PLANS[plan].limits

  const meters: Meter[] = [
    { label: 'Documents', used: usage?.documents ?? 0, total: usage?.maxDocuments ?? lim.documents, render: (n) => String(n) },
    { label: 'Storage', used: usage?.storageBytes ?? 0, total: usage?.maxStorageBytes ?? lim.storageBytes, render: (n) => formatBytes(n) },
    { label: 'Chunks', used: usage?.chunks ?? 0, total: usage?.maxChunks ?? lim.chunks, render: (n) => formatNumber(n) },
    { label: 'Questions this month', used: usage?.questionsThisMonth ?? 0, total: usage?.maxQuestionsPerMonth ?? lim.questionsPerMonth, render: (n) => formatNumber(n) },
  ]

  return (
    <section className="card usage">
      <div className="usage__head">
        <span className="usage__plan">
          <PlanIcon size={16} color={plan === 'free' ? 'var(--on-primary-soft)' : 'var(--accent)'} />
          {PLANS[plan].name} plan
        </span>
        {isFree ? (
          <Button size="sm" onClick={() => navigate('/pricing')}>
            Upgrade
          </Button>
        ) : (
          <span className="pill pill--ok">
            <span className="pill__dot" />
            Active
          </span>
        )}
      </div>

      <div className="statgrid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {meters.map((m) => {
          const pct = m.total > 0 ? Math.min(100, Math.round((m.used / m.total) * 100)) : 0
          const warn = pct >= 80
          return (
            <div className="usage__meter" key={m.label}>
              <div className="usage__meter-top">
                <span>{m.label}</span>
                <span>
                  <b>{m.render(m.used)}</b> / {m.render(m.total)}
                </span>
              </div>
              <div className={`usage__bar${warn ? ' usage__bar--warn' : ''}`}>
                <i style={{ width: `${Math.max(pct, 2)}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {isFree && (
        <p className="muted" style={{ fontSize: '0.78rem' }}>
          You're on the Free plan. Upgrade to Pro or Team for more documents,
          storage, chunks and questions.
        </p>
      )}
    </section>
  )
}
