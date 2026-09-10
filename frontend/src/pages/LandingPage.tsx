import { Fragment, type ReactNode } from 'react'
import {
  ArrowRight,
  ArrowDown,
  Boxes,
  FileUp,
  FileText,
  Binary,
  Database,
  Sparkles,
  Quote,
  Cpu,
  SlidersHorizontal,
  Layers3,
  ShieldCheck,
  Code2,
  GitBranch,
  BookOpen,
  Eye,
  ScrollText,
  Scissors,
  Server,
  Search,
  MonitorSmartphone,
  Settings2,
  Rocket,
  GraduationCap,
  Briefcase,
  Building2,
} from 'lucide-react'
import MarketingNav from '../components/marketing/MarketingNav'
import MarketingFooter from '../components/marketing/MarketingFooter'
import PricingPlans from '../components/marketing/PricingPlans'
import LiveDemo from '../components/marketing/LiveDemo'
import VideoEmbed from '../components/marketing/VideoEmbed'
import Badge from '../components/ui/Badge'
import { LinkButton } from '../components/ui/Button'
import { GithubIcon } from '../components/ui/icons'

const GITHUB_URL = 'https://github.com/shamiulriyad/rag-kit'

const PAIN = [
  { label: 'PDF Processing', icon: FileText },
  { label: 'Chunking', icon: Scissors },
  { label: 'Embeddings', icon: Binary },
  { label: 'Vector Database', icon: Database },
  { label: 'Retrieval', icon: Search },
  { label: 'LLM Integration', icon: Sparkles },
  { label: 'Backend API', icon: Server },
  { label: 'Frontend', icon: MonitorSmartphone },
  { label: 'Configuration', icon: Settings2 },
]

const STEPS = [
  { n: '01', title: 'Clone', body: 'Pull the repository and open it in your editor.' },
  { n: '02', title: 'Configure', body: 'Set your Gemini key, models and Qdrant URL in .env.' },
  { n: '03', title: 'Add Documents', body: 'Drop PDFs into the UI or run the CLI ingester.' },
  { n: '04', title: 'Index', body: 'Text is extracted, chunked, embedded and stored in Qdrant.' },
  { n: '05', title: 'Ask Questions', body: 'Query your knowledge base and get answers with sources.' },
]

const FEATURES = [
  {
    icon: Boxes,
    title: 'Modular Pipeline',
    body: 'Separate ingestion, embedding, retrieval and generation components.',
  },
  {
    icon: FileUp,
    title: 'Document Ingestion',
    body: 'Turn PDFs into searchable knowledge.',
  },
  {
    icon: Database,
    title: 'Vector Search',
    body: 'Store and retrieve relevant document chunks using Qdrant.',
  },
  {
    icon: Quote,
    title: 'Source-Aware Answers',
    body: 'Show users where answers came from.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Bring Your Own Models',
    body: 'Keep LLM and embedding configuration flexible.',
  },
  {
    icon: Code2,
    title: 'Developer Friendly',
    body: 'React + ASP.NET Core + Python architecture.',
  },
  {
    icon: Settings2,
    title: 'Configurable',
    body: 'Control chunking, retrieval and model settings.',
  },
  {
    icon: GitBranch,
    title: 'Open Source',
    body: 'Understand, modify and extend the foundation.',
  },
]

const ARCH_LAYERS = [
  {
    name: 'React',
    body: 'The UI. Talks only to the .NET API over HTTP/JSON.',
  },
  {
    name: 'ASP.NET Core API',
    body: 'The gateway. Validates uploads, enforces limits, forwards requests.',
  },
  {
    name: 'Python RAG Engine',
    body: 'Extraction, cleaning, chunking, embedding, retrieval and prompt assembly.',
  },
]

const PERSONAS = [
  {
    icon: Cpu,
    title: 'AI/ML Developers',
    body: 'Skip the plumbing and iterate on retrieval quality and prompts.',
  },
  {
    icon: Layers3,
    title: 'Full-Stack Developers',
    body: 'A typed React + .NET + Python stack you can read end to end.',
  },
  {
    icon: Rocket,
    title: 'Hackathon Builders',
    body: 'Go from clone to a working Q&A demo in an afternoon.',
  },
  {
    icon: Briefcase,
    title: 'Freelancers',
    body: 'A reusable foundation to deliver document-Q&A projects faster.',
  },
  {
    icon: GraduationCap,
    title: 'Students & Researchers',
    body: 'A clear reference implementation of a full RAG pipeline.',
  },
  {
    icon: Building2,
    title: 'Startups & Small Teams',
    body: 'Own the stack instead of renting a black-box RAG API.',
  },
]

const USE_CASES = [
  { emoji: '📚', label: 'AI Study Assistant' },
  { emoji: '📄', label: 'Research Paper Assistant' },
  { emoji: '🏢', label: 'Internal Knowledge Base' },
  { emoji: '🎓', label: 'Educational RAG' },
  { emoji: '💻', label: 'Developer Documentation Assistant' },
  { emoji: '📖', label: 'Document Q&A' },
]

const TRUST = [
  { icon: GitBranch, label: 'Open Source' },
  { icon: Eye, label: 'Open to inspection' },
  { icon: BookOpen, label: 'Documented' },
  { icon: Boxes, label: 'Modular architecture' },
  { icon: Code2, label: 'Developer-focused' },
  { icon: SlidersHorizontal, label: 'Transparent configuration' },
]

const TECHS = [
  { name: 'React', icon: Layers3 },
  { name: 'ASP.NET Core', icon: ShieldCheck },
  { name: 'Python', icon: Cpu },
  { name: 'Qdrant', icon: Database },
  { name: 'Gemini', icon: Sparkles },
]

const FAQ = [
  {
    q: 'What is RAG Starter?',
    a: 'An open-source starter for building retrieval-augmented generation apps: document ingestion, embeddings, vector search with Qdrant, retrieval, and grounded answers from an LLM — wired together across a React frontend, an ASP.NET Core API and a Python engine.',
  },
  {
    q: 'Do I need to know RAG to use it?',
    a: 'No. The pipeline works out of the box with sensible defaults. Understanding chunking, embeddings and retrieval helps you tune it, and the documentation walks through each stage.',
  },
  {
    q: 'Can I use my own documents?',
    a: 'Yes. Upload PDFs from the Documents page or run the CLI ingester. Text-based PDFs work directly; scanned PDFs need OCR first and the app tells you when that is the case.',
  },
  {
    q: 'Which LLMs are supported?',
    a: 'Google Gemini is wired in by default. The LLM layer is configurable through .env, so an OpenAI-compatible or self-hosted model can be swapped in.',
  },
  {
    q: 'What is Qdrant?',
    a: 'An open-source vector database. RAG Starter runs it as a standalone server via Docker Compose and stores document chunk embeddings in it for similarity search.',
  },
  {
    q: 'Can I customize the embedding model?',
    a: 'Yes. Set EMBEDDING_MODEL in .env. The default is multilingual (BAAI/bge-m3) so mixed-language documents work; changing it means re-indexing.',
  },
  {
    q: 'Is the Free plan really free?',
    a: 'Yes — $0, no card. Plans here are a frontend demo for now: they gate limits in the UI but there is no billing backend yet.',
  },
  {
    q: 'Can I use it for my own projects?',
    a: 'Yes. It is MIT-licensed. Clone it, change it, ship it as the foundation of your own product.',
  },
  {
    q: 'Is authentication / payment available yet?',
    a: 'Not yet. Authentication is frontend-only (mock, localStorage) and there is no payment processing or billing backend. The UI is built so a real backend can drop in later without a rewrite.',
  },
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

      {/* 2. Hero */}
      <section className="hero">
        <div className="container hero__inner">
          <div>
            <Badge tone="primary" dot>
              Open-source RAG starter for developers
            </Badge>
            <h1 className="hero__title">
              Build RAG Systems.{' '}
              <span className="grad">Without Starting From Zero.</span>
            </h1>
            <p className="hero__sub">
              RAG Starter gives you the foundation for document ingestion,
              embeddings, vector search, retrieval, and LLM integration — so you
              can focus on your product.
            </p>
            <div className="hero__ctas">
              <LinkButton size="lg" to="/signup">
                Start Free
                <ArrowRight size={16} />
              </LinkButton>
              <LinkButton variant="secondary" size="lg" href={GITHUB_URL}>
                <GithubIcon size={16} />
                View on GitHub
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

      {/* 3. Problem */}
      <Section
        id="problem"
        eyebrow="The Problem"
        title="Building RAG shouldn't mean rebuilding everything."
        lead="Every RAG project drags the same infrastructure behind it before you write a line of product code."
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
          <p>
            RAG Starter gives you the foundation so you can focus on building your
            actual product.
          </p>
        </div>
      </Section>

      {/* 4. Solution */}
      <Section
        id="solution"
        eyebrow="The Solution"
        title="From idea to working RAG foundation in minutes."
        lead="Five steps. No architecture decisions to agonise over."
      >
        <div className="steps">
          {STEPS.map((s) => (
            <div className="step" key={s.n}>
              <span className="step__num">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 5. Live demo */}
      <Section
        id="demo"
        eyebrow="Live Demo"
        title="See it work, end to end."
        lead="Upload a document, watch it get indexed, then ask a question and get a grounded answer with sources — all mocked, right here."
      >
        <LiveDemo />
      </Section>

      {/* 6. Features */}
      <Section
        id="features"
        eyebrow="Features"
        title="Everything you need to start building RAG"
      >
        <div className="features__grid">
          {FEATURES.map((f) => (
            <article className="card card--interactive feature" key={f.title}>
              <span className="feature__icon">
                <f.icon />
              </span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* 7. Architecture */}
      <Section
        id="architecture"
        eyebrow="Architecture"
        title="Built for developers. Designed to stay flexible."
        lead="One request path, each layer with a single responsibility."
      >
        <div className="arch__stack">
          {ARCH_LAYERS.map((l, i) => (
            <Fragment key={l.name}>
              <div className="arch__layer">
                <h3>{l.name}</h3>
                <p>{l.body}</p>
              </div>
              {i < ARCH_LAYERS.length - 1 && (
                <span className="arch__down" aria-hidden>
                  <ArrowDown size={16} />
                </span>
              )}
            </Fragment>
          ))}
          <span className="arch__down" aria-hidden>
            <ArrowDown size={16} />
          </span>
          <div className="arch__branch">
            <div className="arch__layer">
              <h3>Qdrant</h3>
              <p>Vector store (server mode) holding the chunk embeddings.</p>
            </div>
            <div className="arch__layer">
              <h3>Gemini</h3>
              <p>Generates the final answer from the retrieved context.</p>
            </div>
          </div>
        </div>
        <div className="arch__note" style={{ marginTop: 'var(--sp-6)' }}>
          <ScrollText />
          <span>
            Use the architecture as a starting point. Customize it for your own
            application — the React frontend talks only to the .NET API, never to
            Python directly.
          </span>
        </div>
      </Section>

      {/* 8. Who is it for */}
      <Section
        id="who"
        eyebrow="Who It's For"
        title="Built for developers who don't want to reinvent the RAG stack."
      >
        <div className="persona-grid">
          {PERSONAS.map((p) => (
            <article className="persona" key={p.title}>
              <span className="persona__icon">
                <p.icon />
              </span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* 9. Use cases */}
      <Section
        id="use-cases"
        eyebrow="Use Cases"
        title="What people build with a RAG foundation"
        lead="Examples of what the pipeline is well suited to — starting points, not prebuilt products."
      >
        <div className="usecases">
          {USE_CASES.map((u) => (
            <div className="usecase" key={u.label}>
              <span aria-hidden>{u.emoji}</span>
              {u.label}
            </div>
          ))}
        </div>
      </Section>

      {/* 10. Developer experience */}
      <section className="section" id="dx">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Developer Experience</span>
            <h2>Stop rebuilding the same RAG pipeline for every project.</h2>
            <p>
              One repository, a documented .env, and the four commands you already
              know.
            </p>
          </div>
          <div className="dx">
            <div className="dx__steps">
              {[
                ['Configure', 'Copy .env.example and set your keys and models.'],
                ['Add your documents', 'Drop PDFs in the UI or run the CLI ingester.'],
                ['Start the services', 'docker compose up brings the stack online.'],
                ['Ask questions', 'Open Knowledge Chat and query with sources.'],
              ].map(([title, body], i) => (
                <div className="dx__step" key={title}>
                  <span className="dx__num">{i + 1}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="terminal">
              <div className="terminal__bar">
                <i />
                <i />
                <i />
              </div>
              <div className="terminal__body">
                <div>
                  <span className="c-prompt">$ </span>
                  <span className="c-cmd">git clone rag-starter</span>
                </div>
                <div>
                  <span className="c-prompt">$ </span>
                  <span className="c-cmd">cp .env.example .env &amp;&amp; $EDITOR .env</span>
                </div>
                <div>
                  <span className="c-prompt">$ </span>
                  <span className="c-cmd">docker compose up -d</span>
                </div>
                <div className="c-ok"> ✔ frontend · api · rag · qdrant are up</div>
                <div>
                  <span className="c-dim"># open the frontend and ask away</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 'var(--sp-6)' }}>
            <LinkButton size="lg" to="/signup">
              Get Started
              <ArrowRight size={16} />
            </LinkButton>
          </div>
        </div>
      </section>

      {/* 12. Trust / social proof */}
      <Section
        id="trust"
        eyebrow="Trust"
        title="Built for developers. Open to inspection."
        lead="No customer logos or testimonials yet — just the parts of the project you can verify for yourself."
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

      {/* 11. Pricing */}
      <section className="section" id="pricing">
        <div className="container">
          <PricingPlans />
        </div>
      </section>

      {/* 13. FAQ */}
      <Section id="faq" eyebrow="FAQ" title="Questions, answered honestly">
        <div className="faq">
          {FAQ.map((f) => (
            <details className="faq__item" key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* 14. Final CTA */}
      <section className="container">
        <div className="cta">
          <span className="eyebrow">Get Started</span>
          <h2>Your next RAG project shouldn't start from zero.</h2>
          <p style={{ maxWidth: 560, marginInline: 'auto', marginTop: 'var(--sp-3)' }}>
            Start with a working foundation and build what actually matters.
          </p>
          <div className="cta__ctas">
            <LinkButton size="lg" to="/signup">
              Start Free
              <ArrowRight size={16} />
            </LinkButton>
            <LinkButton variant="secondary" size="lg" href={GITHUB_URL}>
              <GithubIcon size={16} />
              View on GitHub
            </LinkButton>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
