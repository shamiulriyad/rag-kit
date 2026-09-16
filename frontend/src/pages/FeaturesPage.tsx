import { ArrowRight } from 'lucide-react'
import FeatureGrid from '../components/marketing/FeatureGrid'
import Badge from '../components/ui/Badge'
import { LinkButton } from '../components/ui/Button'

export default function FeaturesPage() {
  return (
    <div className="marketing">
      <section className="hero hero--compact">
        <div className="container">
          <div className="section-head section-head--center">
            <Badge tone="primary" dot>
              Features
            </Badge>
            <h1 className="hero__title" style={{ fontSize: '2.4rem' }}>
              Everything you need to work with your knowledge.
            </h1>
            <p>From document intelligence to a developer API — built in from the start.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <FeatureGrid />
          <div style={{ textAlign: 'center', marginTop: 'var(--sp-7)' }}>
            <LinkButton size="lg" to="/signup">
              Start Free
              <ArrowRight size={16} />
            </LinkButton>
          </div>
        </div>
      </section>
    </div>
  )
}
