import type { ReactNode } from 'react'
import {
  ArrowRight,
  FileText,
  Binary,
  Database,
  Sparkles,
  Search,
  ScanSearch,
  Sparkle,
  Cpu,
  Layers3,
  ShieldCheck,
  GitBranch,
  BookOpen,
  Eye,
  SlidersHorizontal,
  GraduationCap,
  Users,
  Building2,
  Briefcase,
  Rocket,
} from 'lucide-react'
import MarketingNav from '../components/marketing/MarketingNav'
import MarketingFooter from '../components/marketing/MarketingFooter'
import PricingPlans from '../components/marketing/PricingPlans'
import LiveDemo from '../components/marketing/LiveDemo'
import VideoEmbed from '../components/marketing/VideoEmbed'
import FeatureGrid from '../components/marketing/FeatureGrid'
import ArchitectureDiagram from '../components/marketing/ArchitectureDiagram'
import HowItWorksTracks from '../components/marketing/HowItWorksTracks'
import Faq from '../components/marketing/Faq'
import Badge from '../components/ui/Badge'
import { LinkButton } from '../components/ui/Button'
import { GithubIcon } from '../components/ui/icons'

const GITHUB_URL = 'https://github.com/shamiulriyad/rag-kit'

const PAIN = [
  { label: 'PDFs & manuals', icon: FileText },
  { label: 'Course materials', icon: BookOpen },
  { label: 'Research papers', icon: ScanSearch },
  { label: 'Company policies', icon: ShieldCheck },
  { label: 'Documentation', icon: Binary },
  { label: 'Internal knowledge', icon: Database },
]

const CUSTOMER_SOLUTION_STEPS = [
  { n: '01', title: 'Upload', body: 'Add your documents to a knowledge base.' },
  { n: '02', title: 'Process', body: 'Text is extracted, cleaned and chunked automatically.' },
  { n: '03', title: 'Index', body: 'Chunks are embedded and stored for retrieval.' },
  { n: '04', title: 'Ask', body: 'Ask a question in plain language.' },
  { n: '05', title: 'Get grounded answer', body: 'Receive an answer with citations back to your documents.' },
]

const CUSTOMER_PERSONAS = [
  { icon: GraduationCap, title: 'Students', body: 'Ask questions across your course materials instead of re-reading everything.' },
  { icon: Users, title: 'Teachers', body: 'Turn your teaching materials into an assistant students can query.' },
  { icon: Sparkle, title: 'Course creators', body: 'Let learners ask your content questions and get grounded answers.' },
  { icon: Briefcase, title: 'Small teams', body: 'Give the whole team a shared, searchable knowledge workspace.' },
  { icon: Building2, title: 'Businesses', body: 'Build an internal assistant over policies, docs and manuals.' },
  { icon: Search, title: 'Research teams', body: 'Search and understand large collections of papers and reports.' },
]

const DEVELOPER_PERSONAS = [
  { icon: Cpu, title: 'AI/ML Developers', body: 'Skip the plumbing and iterate on retrieval quality and prompts.' },
  { icon: Layers3, title: 'Full-Stack Developers', body: 'A typed React + .NET + Python stack you can read end to end.' },
  { icon: Rocket, title: 'Hackathon Builders', body: 'Go from clone to a working Q&A demo in an afternoon.' },
  { icon: GraduationCap, title: 'Researchers', body: 'A clear reference implementation of a full RAG pipeline.' },
  { icon: Building2, title: 'Startups & Small Teams', body: 'Own the stack instead of renting a black-box RAG API.' },
]

const USE_CASES = [
  { emoji: '🎓', label: 'Education', body: 'Ask questions across course materials.' },
  { emoji: '🔬', label: 'Research', body: 'Search and understand research documents.' },
  { emoji: '🏢', label: 'Business', body: 'Create an internal company knowledge assistant.' },
  { emoji: '📄', label: 'Documentation', body: 'Ask questions across technical documentation.' },
  { emoji: '🧠', label: 'Personal Knowledge', body: 'Build an AI workspace around your own documents.' },
]

const TRUST = [
  { icon: GitBranch, label: 'Open-source foundation' },
  { icon: Eye, label: 'Transparent architecture' },
  { icon: Sparkles, label: 'Source citations' },
  { icon: ShieldCheck, label: 'Secure workspace isolation' },
  { icon: BookOpen, label: 'Developer documentation' },
  { icon: SlidersHorizontal, label: 'No vendor lock-in on the self-hosted version' },
]

const TECHS = [
  { name: 'React', icon: Layers3 },
  { name: 'ASP.NET Core', icon: ShieldCheck },
  { name: 'Python', icon: Cpu },
  { name: 'Qdrant', icon: Database },
  { name: 'Gemini', icon: Sparkles },
]

function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
}: {
  id?: string
  eyebrow: string
  title: string
  lead?: string
  children: ReactNode
}) {
  return (
    <section className="section" id={id}>
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

export default function LandingPage() {
  return (
    <div className="marketing">
      <MarketingNav />

      {/* Hero */}
      <section className="hero">
        <div className="container hero__inner">
          <div>
            <Badge tone="primary" dot>
              AI Knowledge Platform
            </Badge>
            <h1 className="hero__title">
              Turn Your Documents Into an{' '}
              <span className="grad">AI Knowledge Workspace.</span>
            </h1>
            <p className="hero__sub">
              Upload your documents, ask questions, and get reliable answers grounded in your
              own knowledge.
            </p>
            <div className="hero__ctas">
              <LinkButton size="lg" to="/signup">
                Start Free
                <ArrowRight size={16} />
              </LinkButton>
              <LinkButton variant="secondary" size="lg" to="/developers">
                Explore for Developers
              </LinkButton>
            </div>
            <p className="muted" style={{ fontSize: '0.85rem', marginTop: 'var(--sp-4)' }}>
              No credit card required
            </p>
            <p className="hero__stack">
              Built with <b>React</b> · <b>ASP.NET Core</b> · <b>Python</b> ·{' '}
              <b>Qdrant</b> · <b>Gemini</b>
            </p>
          </div>

          <div className="hero__media">
            <VideoEmbed badge="Product Demo" />
          </div>
        </div>
      </section>

      {/* Problem */}
      <Section
        id="problem"
        eyebrow="The Problem"
        title="Your knowledge is trapped in documents."
        lead="PDFs, course materials, manuals, documentation, research papers and company policies pile up. Searching manually is slow, and generic AI doesn't automatically know your private documents."
      >
        <div className="prob__grid">
          {PAIN.map((p) => (
            <div className="prob__item" key={p.label}>
              <p.icon />
              {p.label}
            </div>
          ))}
        </div>
        <div className="prob__solve">
          <Sparkles />
          <p>RAG Starter turns that pile of documents into a workspace you can ask questions of.</p>
        </div>
      </Section>

      {/* Solution */}
      <Section
        id="solution"
        eyebrow="The Solution"
        title="Your documents. Your knowledge. Your AI."
      >
        <div className="steps">
          {CUSTOMER_SOLUTION_STEPS.map((s) => (
            <div className="step" key={s.n}>
              <span className="step__num">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Product demo */}
      <Section
        id="demo"
        eyebrow="Product Demo"
        title="See it work, end to end."
        lead="Create a knowledge base, upload a document, watch it get processed, then ask a question and get a grounded answer with sources — all mocked, right here."
      >
        <LiveDemo />
      </Section>

      {/* How it works — two tracks, kept visually separate */}
      <Section
        id="how-it-works"
        eyebrow="How It Works"
        title="Two workflows. One platform."
        lead="Use the hosted product as a customer, or self-host the same architecture as a developer."
      >
        <HowItWorksTracks />
      </Section>

      {/* Features */}
      <Section id="features" eyebrow="Features" title="Everything you need to work with your knowledge">
        <FeatureGrid />
      </Section>

      {/* Who is it for */}
      <Section id="who" eyebrow="Who It's For" title="Built for two kinds of people.">
        <div className="section-head" style={{ marginBottom: 'var(--sp-5)' }}>
          <h3 style={{ margin: 0 }}>For Customers</h3>
          <p className="muted" style={{ margin: 0 }}>Use AI without building the infrastructure.</p>
        </div>
        <div className="persona-grid">
          {CUSTOMER_PERSONAS.map((p) => (
            <article className="persona" key={p.title}>
              <span className="persona__icon">
                <p.icon />
              </span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </article>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 'var(--sp-5)' }}>
          <LinkButton to="/signup">Start Using It</LinkButton>
        </div>

        <div className="section-head" style={{ margin: 'var(--sp-8) 0 var(--sp-5)' }}>
          <h3 style={{ margin: 0 }}>For Developers</h3>
          <p className="muted" style={{ margin: 0 }}>Build your own RAG system without starting from zero.</p>
        </div>
        <div className="persona-grid">
          {DEVELOPER_PERSONAS.map((p) => (
            <article className="persona" key={p.title}>
              <span className="persona__icon">
                <p.icon />
              </span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </article>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 'var(--sp-5)' }}>
          <LinkButton variant="secondary" to="/developers">
            Explore Developer Tools
          </LinkButton>
        </div>
      </Section>

      {/* Use cases */}
      <Section
        id="use-cases"
        eyebrow="Use Cases"
        title="What people build with a knowledge workspace"
      >
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

      {/* Developer experience */}
      <section className="section" id="dx">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Developer Experience</span>
            <h2>RAG Starter Open Source</h2>
            <p>
              Self-hosted, modular architecture: React, ASP.NET Core API, a Python RAG engine,
              Qdrant, and a swappable LLM/embedding provider. The GitHub repository is the
              developer / self-hosted version — it isn't the same deployment as the hosted SaaS.
            </p>
          </div>
          <ArchitectureDiagram />
          <div style={{ marginTop: 'var(--sp-6)', display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
            <LinkButton variant="secondary" href={GITHUB_URL}>
              <GithubIcon size={16} />
              View on GitHub
            </LinkButton>
            <LinkButton variant="ghost" to="/docs">
              Read Documentation
            </LinkButton>
          </div>
        </div>
      </section>

      {/* Trust */}
      <Section
        id="trust"
        eyebrow="Trust"
        title="No fake testimonials — just what you can verify."
      >
        <div className="trust2">
          <div className="trust2__grid">
            {TRUST.map((t) => (
              <div className="trust2__item" key={t.label}>
                <t.icon />
                {t.label}
              </div>
            ))}
          </div>
          <div className="trust__row">
            {TECHS.map((t) => (
              <span className="tech" key={t.name}>
                <span className="tech__icon">
                  <t.icon size={16} />
                </span>
                {t.name}
              </span>
            ))}
          </div>
          <LinkButton variant="secondary" href={GITHUB_URL}>
            <GithubIcon size={16} />
            Read the source on GitHub
          </LinkButton>
        </div>
      </Section>

      {/* Pricing */}
      <section className="section" id="pricing">
        <div className="container">
          <PricingPlans />
        </div>
      </section>

      {/* FAQ */}
      <Section id="faq" eyebrow="FAQ" title="Questions, answered honestly">
        <Faq />
      </Section>

      {/* Final CTA */}
      <section className="container">
        <div className="cta">
          <span className="eyebrow">Get Started</span>
          <h2>Start building your knowledge workspace.</h2>
          <p style={{ maxWidth: 560, marginInline: 'auto', marginTop: 'var(--sp-3)' }}>
            Start with a working foundation and build what actually matters.
          </p>
          <div className="cta__ctas">
            <LinkButton size="lg" to="/signup">
              Start Free
              <ArrowRight size={16} />
            </LinkButton>
            <LinkButton variant="secondary" size="lg" to="/github">
              <GithubIcon size={16} />
              Explore GitHub
            </LinkButton>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
