import { useNavigate } from 'react-router-dom'
import { Sparkles, Zap, Users } from 'lucide-react'
import { Button } from '../ui/Button'
import { PLANS, usePlan } from '../../lib/plan'
import { formatBytes, formatNumber } from '../../lib/format'
import { mockDocuments, questionsThisMonth } from '../../lib/mockData'

interface Meter {
  label: string
  used: number
  total: number
  render: (n: number) => string
}

export default function PlanUsageCard() {
  const navigate = useNavigate()
  const { plan, limits, isFree } = usePlan()
  const PlanIcon = plan === 'pro' ? Zap : plan === 'team' ? Users : Sparkles

  const usedStorage = mockDocuments.reduce((s, d) => s + d.sizeBytes, 0)
  const usedChunks = mockDocuments.reduce((s, d) => s + d.chunks, 0)

  const meters: Meter[] = [
    {
      label: 'Documents',
      used: mockDocuments.length,
      total: limits.documents,
      render: (n) => String(n),
    },
    {
      label: 'Storage',
      used: usedStorage,
      total: limits.storageBytes,
      render: (n) => formatBytes(n),
    },
    {
      label: 'Chunks',
      used: usedChunks,
      total: limits.chunks,
      render: (n) => formatNumber(n),
    },
    {
      label: 'Questions this month',
      used: questionsThisMonth,
      total: limits.questionsPerMonth,
      render: (n) => formatNumber(n),
    },
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
          const pct = Math.min(100, Math.round((m.used / m.total) * 100))
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
          storage, chunks and questions. Billing is not live yet — upgrades here
          are a demo.
        </p>
      )}
    </section>
  )
}
