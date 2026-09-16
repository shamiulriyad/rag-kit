import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import LiveDemo from '../components/marketing/LiveDemo'
import FeatureGrid, { FEATURES } from '../components/marketing/FeatureGrid'
import PricingPlans from '../components/marketing/PricingPlans'
import Badge from '../components/ui/Badge'
import { LinkButton } from '../components/ui/Button'

const CUSTOMER_STEPS = [
  { n: '01', title: 'Upload', body: 'Add your documents to a knowledge base.' },
  { n: '02', title: 'Process', body: 'Text is extracted, cleaned and chunked automatically.' },
  { n: '03', title: 'Index', body: 'Chunks are embedded and stored for retrieval.' },
  { n: '04', title: 'Ask', body: 'Ask a question in plain language.' },
  { n: '05', title: 'Get grounded answer', body: 'Receive an answer with citations back to your documents.' },
]

const USE_CASES = [
  { emoji: '🎓', label: 'Education', body: 'Ask questions across course materials.' },
  { emoji: '🔬', label: 'Research', body: 'Search and understand research documents.' },
  { emoji: '🏢', label: 'Business', body: 'Create an internal company knowledge assistant.' },
  { emoji: '📄', label: 'Documentation', body: 'Ask questions across technical documentation.' },
  { emoji: '🧠', label: 'Personal Knowledge', body: 'Build an AI workspace around your own documents.' },
]

function Section({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string
  title: string
  lead?: string
  children: ReactNode
}) {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head section-head--center">
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          {lead && <p>{lead}</p>}
        </div>
        {children}
      </div>
    </section>
  )
}

export default function ProductPage() {
  return (
    <div className="marketing">
      <section className="hero hero--compact">
        <div className="container">
          <div className="section-head section-head--center">
            <Badge tone="primary" dot>
              For Customers
            </Badge>
            <h1 className="hero__title" style={{ fontSize: '2.4rem' }}>
              Turn your documents into an AI knowledge workspace.
            </h1>
            <p>
              Upload your documents, ask questions, and get reliable answers grounded in your
              own knowledge — no infrastructure to manage.
            </p>
            <div className="hero__ctas" style={{ justifyContent: 'center' }}>
              <LinkButton size="lg" to="/signup">
                Start Free
                <ArrowRight size={16} />
              </LinkButton>
              <LinkButton variant="secondary" size="lg" to="/pricing">
                See Pricing
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      <Section eyebrow="The Solution" title="Your documents. Your knowledge. Your AI.">
        <div className="steps">
          {CUSTOMER_STEPS.map((s) => (
            <div className="step" key={s.n}>
              <span className="step__num">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Product Demo" title="See it work, end to end.">
        <LiveDemo />
      </Section>

      <Section eyebrow="Features" title="What you get">
        <FeatureGrid items={FEATURES.slice(0, 6)} />
      </Section>

      <Section eyebrow="Use Cases" title="What people build with it">
        <div className="usecases">
          {USE_CASES.map((u) => (
            <div className="usecase usecase--body" key={u.label}>
              <span aria-hidden>{u.emoji}</span>
              <div>
                <strong>{u.label}</strong>
                <p className="muted">{u.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <section className="section" id="pricing">
        <div className="container">
          <PricingPlans />
        </div>
      </section>
    </div>
  )
}
