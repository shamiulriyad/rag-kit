import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Minus, Star, Users } from 'lucide-react'
import { PLANS, YEARLY_SAVING_PCT, usePlan } from '../../lib/plan'
import { useToast } from '../ui/Toast'
import TeamUpgradeModal from './TeamUpgradeModal'

type Cycle = 'monthly' | 'yearly'

const COMPARE: { label: string; free: string; pro: string; team: string }[] = [
  { label: 'Documents', free: '3', pro: '50', team: '200' },
  { label: 'Storage', free: '500 MB', pro: '10 GB', team: '50 GB' },
  { label: 'Chunks', free: '5,000', pro: '100,000', team: '500,000' },
  {
    label: 'Questions',
    free: '100 / month',
    pro: '5,000 / month',
    team: '25,000 / month',
  },
  { label: 'Knowledge Bases', free: '1', pro: '10', team: '50' },
  { label: 'Source Citations', free: '✓', pro: '✓', team: '✓' },
  { label: 'Advanced RAG', free: '—', pro: '✓', team: '✓' },
  { label: 'Analytics', free: 'Basic', pro: 'Advanced', team: 'Advanced' },
  { label: 'Team Workspace', free: '—', pro: '—', team: '✓' },
  { label: 'Collaboration', free: '—', pro: '—', team: '✓' },
  { label: 'Priority Support', free: '—', pro: '✓', team: '✓' },
]

function Cell({ value }: { value: string }) {
  if (value === '✓')
    return (
      <span className="compare__yes">
        <Check size={15} />
      </span>
    )
  if (value === '—')
    return (
      <span className="compare__no">
        <Minus size={15} />
      </span>
    )
  return <span>{value}</span>
}

export default function PricingPlans({
  onChoosePro,
  onChooseTeam,
}: {
  onChoosePro?: () => void
  onChooseTeam?: () => void
}) {
  const [cycle, setCycle] = useState<Cycle>('monthly')
  const [teamModal, setTeamModal] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const { changePlan } = usePlan()
  const yearly = cycle === 'yearly'

  const free = PLANS.free
  const pro = PLANS.pro
  const team = PLANS.team

  function choosePro() {
    if (onChoosePro) return onChoosePro()
    changePlan('pro')
    toast('ok', 'Pro plan activated (demo — no payment was processed).')
  }

  function chooseTeam() {
    if (onChooseTeam) return onChooseTeam()
    setTeamModal(true)
  }

  return (
    <div className="pricing">
      <div className="section-head section-head--center">
        <span className="eyebrow">Pricing &amp; Plans</span>
        <h2>Start Free. Scale When You Need.</h2>
        <p>
          Everything you need to build and experiment with RAG — without starting
          from scratch.
        </p>
        <p className="pricing__trust">
          No credit card required · Free plan available · Upgrade anytime
        </p>
      </div>

      <div className="pricing__toggle" role="tablist" aria-label="Billing cycle">
        <button
          role="tab"
          aria-selected={!yearly}
          className={!yearly ? 'is-active' : ''}
          onClick={() => setCycle('monthly')}
        >
          Monthly
        </button>
        <button
          role="tab"
          aria-selected={yearly}
          className={yearly ? 'is-active' : ''}
          onClick={() => setCycle('yearly')}
        >
          Yearly
          <span className="pricing__save">Save {YEARLY_SAVING_PCT}%</span>
        </button>
      </div>

      <div className="plans plans--3">
        {/* Free */}
        <article className="plan">
          <header className="plan__head">
            <span className="plan__name">{free.name}</span>
            <p className="plan__blurb">{free.blurb}</p>
          </header>
          <div className="plan__price">
            <span className="plan__amount">$0</span>
            <span className="plan__period">{yearly ? '/ forever' : '/ month'}</span>
          </div>
          <p className="plan__note">{yearly ? '$0 forever — no card, ever' : ' '}</p>
          <p className="plan__tagline">{free.tagline}</p>
          <button
            className="btn btn--secondary btn--block plan__cta"
            onClick={() => navigate('/signup')}
          >
            {free.cta}
          </button>
          <ul className="plan__features">
            {free.features.map((f) => (
              <li key={f}>
                <Check size={15} />
                {f}
              </li>
            ))}
          </ul>
        </article>

        {/* Pro */}
        <article className="plan plan--pro">
          <span className="plan__badge">
            <Star size={12} fill="currentColor" />
            MOST POPULAR
          </span>
          <header className="plan__head">
            <span className="plan__name">{pro.name}</span>
            <p className="plan__blurb">{pro.blurb}</p>
          </header>
          <div className="plan__price">
            <span className="plan__amount">
              ${yearly ? '10' : pro.priceMonthly}
            </span>
            <span className="plan__period">/ month</span>
          </div>
          <p className="plan__note">
            {yearly
              ? `$${pro.priceYearly} / year billed yearly · save ${YEARLY_SAVING_PCT}%`
              : `or $${pro.priceYearly} / year`}
          </p>
          <p className="plan__tagline">{pro.tagline}</p>
          <button
            className="btn btn--primary btn--block plan__cta"
            onClick={choosePro}
          >
            {pro.cta}
          </button>
          <ul className="plan__features">
            {pro.features.map((f) => (
              <li key={f}>
                <Check size={15} />
                {f}
              </li>
            ))}
          </ul>
        </article>

        {/* Team */}
        <article className="plan plan--team">
          <span className="plan__label">
            <Users size={11} />
            For Teams
          </span>
          <header className="plan__head">
            <span className="plan__name">{team.name}</span>
            <p className="plan__blurb">{team.blurb}</p>
          </header>
          <div className="plan__price">
            <span className="plan__amount">
              ${yearly ? '24.17' : team.priceMonthly}
            </span>
            <span className="plan__period">/ month</span>
          </div>
          <p className="plan__note">
            {yearly
              ? `$${team.priceYearly} / year billed yearly · save ${YEARLY_SAVING_PCT}%`
              : `or $${team.priceYearly} / year`}
          </p>
          <p className="plan__tagline">{team.tagline}</p>
          <button
            className="btn btn--secondary btn--block plan__cta"
            onClick={chooseTeam}
          >
            {team.cta}
          </button>
          <ul className="plan__features">
            {team.features.map((f) => (
              <li key={f}>
                <Check size={15} />
                {f}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div className="compare-wrap scroll">
        <table className="compare compare--3">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Free</th>
              <th className="compare__pro-col">Pro</th>
              <th>Team</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>
                  <Cell value={row.free} />
                </td>
                <td className="compare__pro-col">
                  <Cell value={row.pro} />
                </td>
                <td>
                  <Cell value={row.team} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="pricing__disclaimer">
        Plans and upgrades are a frontend demo for the current MVP. No payment is
        processed and there is no billing backend yet.
      </p>

      <TeamUpgradeModal
        open={teamModal}
        onClose={() => setTeamModal(false)}
        onContinue={() => {
          changePlan('team')
          toast('ok', 'Team plan activated (demo — no payment was processed).')
          setTeamModal(false)
        }}
      />
    </div>
  )
}
