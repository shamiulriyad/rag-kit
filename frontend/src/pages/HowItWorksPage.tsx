import HowItWorksTracks from '../components/marketing/HowItWorksTracks'
import Badge from '../components/ui/Badge'

export default function HowItWorksPage() {
  return (
    <div className="marketing">
      <section className="hero hero--compact">
        <div className="container">
          <div className="section-head section-head--center">
            <Badge tone="primary" dot>
              How It Works
            </Badge>
            <h1 className="hero__title" style={{ fontSize: '2.4rem' }}>
              Two workflows. One platform.
            </h1>
            <p>
              Use the hosted product as a customer, or self-host the same architecture as a
              developer. The two experiences are kept deliberately separate.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <HowItWorksTracks />
        </div>
      </section>
    </div>
  )
}
