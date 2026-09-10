import { useNavigate } from 'react-router-dom'
import { CreditCard, ArrowRight, Check, Sparkles, Zap, Users } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { PLANS, usePlan, type PlanId } from '../lib/plan'
import { formatBytes, formatNumber } from '../lib/format'
import { mockDocuments, questionsThisMonth } from '../lib/mockData'

const PLAN_ICON: Record<PlanId, typeof Sparkles> = {
  free: Sparkles,
  pro: Zap,
  team: Users,
}

export default function BillingPage() {
  const navigate = useNavigate()
  const { plan, limits, changePlan } = usePlan()
  const current = PLANS[plan]
  const Icon = PLAN_ICON[plan]

  const usedStorage = mockDocuments.reduce((s, d) => s + d.sizeBytes, 0)
  const usedChunks = mockDocuments.reduce((s, d) => s + d.chunks, 0)

  const meters = [
    {
      label: 'Documents',
      used: mockDocuments.length,
      total: limits.documents,
      fmt: (n: number) => String(n),
    },
    {
      label: 'Chunks',
      used: usedChunks,
      total: limits.chunks,
      fmt: formatNumber,
    },
    {
      label: 'Questions',
      used: questionsThisMonth,
      total: limits.questionsPerMonth,
      fmt: formatNumber,
    },
    {
      label: 'Storage',
      used: usedStorage,
      total: limits.storageBytes,
      fmt: formatBytes,
    },
  ]

  const cycleStart = new Date()
  cycleStart.setDate(1)
  const cycleEnd = new Date(cycleStart)
  cycleEnd.setMonth(cycleEnd.getMonth() + 1)
  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const upgradeTargets = (['pro', 'team'] as PlanId[]).filter((p) => p !== plan)

  return (
    <div className="page">
      <div className="secret-note">
        <CreditCard />
        <span>
          Billing is a frontend demo. There is no payment provider, invoice or
          subscription backend — switching plans updates this browser only.
        </span>
      </div>

      {/* Current plan */}
      <section className="card">
        <div className="grid-2" style={{ gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'center' }}>
            <span className="stat__icon" style={{ width: 44, height: 44 }}>
              <Icon />
            </span>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {current.name} Plan
              </div>
              <div className="muted" style={{ fontSize: '0.86rem' }}>
                {plan === 'free'
                  ? 'No billing — free forever'
                  : `$${current.priceMonthly} / month · billing cycle ${fmtDate(
                      cycleStart,
                    )} – ${fmtDate(cycleEnd)}`}
              </div>
            </div>
          </div>
          <Button onClick={() => navigate('/pricing')}>
            {plan === 'team' ? 'Compare plans' : 'Upgrade Plan'}
            <ArrowRight size={15} />
          </Button>
        </div>
      </section>

      {/* Monthly usage */}
      <section className="card">
        <div className="panel-head">
          <h3>Monthly usage</h3>
          <span className="muted" style={{ fontSize: '0.8rem' }}>
            Resets {fmtDate(cycleEnd)}
          </span>
        </div>
        <div className="statgrid">
          {meters.map((m) => {
            const pct = Math.min(100, Math.round((m.used / m.total) * 100))
            return (
              <div className="usage__meter" key={m.label}>
                <div className="usage__meter-top">
                  <span>{m.label}</span>
                  <span>
                    <b>{m.fmt(m.used)}</b> / {m.fmt(m.total)}
                  </span>
                </div>
                <div className={`usage__bar${pct >= 80 ? ' usage__bar--warn' : ''}`}>
                  <i style={{ width: `${Math.max(pct, 2)}%` }} />
                </div>
                <span className="list__meta">{pct}% used</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Upgrade options */}
      <section className="card">
        <div className="panel-head">
          <h3>Upgrade options</h3>
        </div>
        <div className="plan-picker">
          {upgradeTargets.map((id) => {
            const p = PLANS[id]
            return (
              <div
                key={id}
                className={`plan${id === 'pro' ? ' plan--pro' : ''}${
                  id === 'team' ? ' plan--team' : ''
                }`}
                style={{ padding: 'var(--sp-5)' }}
              >
                <span className="plan__name">{p.name}</span>
                <div className="plan__price">
                  <span className="plan__amount" style={{ fontSize: '1.8rem' }}>
                    ${p.priceMonthly}
                  </span>
                  <span className="plan__period">/ month</span>
                </div>
                <ul className="plan__features" style={{ marginTop: 'var(--sp-3)' }}>
                  {p.features.slice(0, 4).map((f) => (
                    <li key={f}>
                      <Check size={15} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={id === 'pro' ? 'primary' : 'secondary'}
                  block
                  onClick={() => {
                    changePlan(id)
                    navigate('/billing')
                  }}
                >
                  Switch to {p.name}
                </Button>
              </div>
            )
          })}
        </div>
        <p className="muted" style={{ fontSize: '0.78rem' }}>
          Prices shown monthly. See the full comparison and yearly pricing on the{' '}
          <button
            className="linklike"
            onClick={() => navigate('/pricing')}
          >
            pricing page
          </button>
          .
        </p>
      </section>
    </div>
  )
}
