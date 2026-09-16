import type { ReactNode } from 'react'
import { ArrowRight, Info } from 'lucide-react'
import ArchitectureDiagram from '../components/marketing/ArchitectureDiagram'
import { DEVELOPER_STEPS } from '../components/marketing/HowItWorksTracks'
import Badge from '../components/ui/Badge'
import { LinkButton } from '../components/ui/Button'
import { GithubIcon } from '../components/ui/icons'

const GITHUB_URL = 'https://github.com/shamiulriyad/rag-kit'

const CAPABILITIES = [
  'Self-hosted — run it on your own infrastructure',
  'Modular architecture — swap any layer independently',
  'Python RAG engine — extraction, chunking, embedding, retrieval',
  'ASP.NET Core API — the typed gateway between React and Python',
  'Qdrant — open-source vector database, run as a standalone server',
  'Gemini / LLM provider abstraction — swap providers through .env',
  'Custom embeddings — configurable, multilingual by default',
  'Configurable chunking — tune chunk size, overlap and top-K',
  'API access — call the pipeline programmatically',
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

export default function DevelopersPage() {
  return (
    <div className="marketing dxpage">
      <section className="hero hero--compact">
        <div className="container">
          <div className="section-head section-head--center">
            <Badge tone="accent" dot>
              For Developers
            </Badge>
            <h1 className="hero__title" style={{ fontSize: '2.4rem' }}>
              Build your own RAG system without starting from zero.
            </h1>
            <p>
              RAG Starter is an open-source foundation for document ingestion, embeddings,
              vector search, retrieval and LLM integration — self-host it and make it yours.
            </p>
            <div className="hero__ctas" style={{ justifyContent: 'center' }}>
              <LinkButton size="lg" href={GITHUB_URL}>
                <GithubIcon size={16} />
                View on GitHub
              </LinkButton>
              <LinkButton variant="secondary" size="lg" to="/docs">
                Read Documentation
                <ArrowRight size={16} />
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="secret-note">
          <Info />
          <span>
            The hosted SaaS and this open-source repository are related but{' '}
            <strong>not the same product</strong>. The hosted product is managed for you; this
            repository is the self-hosted version of the same architecture.
          </span>
        </div>
      </div>

      <Section eyebrow="RAG Starter Open Source" title="Everything is in the repository">
        <div className="dev-caps">
          {CAPABILITIES.map((c) => (
            <div className="dev-caps__item" key={c}>
              {c}
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Architecture" title="One request path, each layer with a single responsibility.">
        <ArchitectureDiagram />
      </Section>

      <Section eyebrow="Developer Workflow" title="Clone. Configure. Run. Customize. Deploy.">
        <div className="steps">
          {DEVELOPER_STEPS.map((s) => (
            <div className="step" key={s.n}>
              <span className="step__num">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <section className="container">
        <div className="cta">
          <span className="eyebrow">Get Started</span>
          <h2>Clone it, run it, make it yours.</h2>
          <div className="cta__ctas">
            <LinkButton size="lg" href={GITHUB_URL}>
              <GithubIcon size={16} />
              View on GitHub
            </LinkButton>
            <LinkButton variant="secondary" size="lg" to="/how-it-works">
              Compare both workflows
            </LinkButton>
          </div>
        </div>
      </section>
    </div>
  )
}
