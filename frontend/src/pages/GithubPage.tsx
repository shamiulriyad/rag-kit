import { Star, GitFork, ScrollText, Terminal } from 'lucide-react'
import Badge from '../components/ui/Badge'
import { LinkButton } from '../components/ui/Button'
import { GithubIcon } from '../components/ui/icons'

const GITHUB_URL = 'https://github.com/shamiulriyad/rag-kit'

export default function GithubPage() {
  return (
    <div className="marketing dxpage">
      <section className="hero hero--compact">
        <div className="container">
          <div className="section-head section-head--center">
            <Badge tone="accent" dot>
              Open Source
            </Badge>
            <h1 className="hero__title" style={{ fontSize: '2.4rem' }}>
              RAG Starter on GitHub
            </h1>
            <p>
              The self-hosted, open-source foundation behind RAG Starter — MIT-licensed, and
              open to inspection.
            </p>
            <div className="hero__ctas" style={{ justifyContent: 'center' }}>
              <LinkButton size="lg" href={GITHUB_URL}>
                <GithubIcon size={16} />
                View Repository
              </LinkButton>
              <LinkButton variant="secondary" size="lg" to="/developers">
                Self-hosting guide
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="dev-caps">
            <div className="dev-caps__item">
              <Star size={15} />
              MIT-licensed — use it commercially, modify it, ship it
            </div>
            <div className="dev-caps__item">
              <GitFork size={15} />
              Fork it and diverge as far as you need to
            </div>
            <div className="dev-caps__item">
              <ScrollText size={15} />
              Full architecture and setup docs live alongside the code
            </div>
            <div className="dev-caps__item">
              <Terminal size={15} />
              Clone, configure .env, docker compose up
            </div>
          </div>

          <div className="terminal" style={{ marginTop: 'var(--sp-7)', maxWidth: 640, marginInline: 'auto' }}>
            <div className="terminal__bar">
              <i />
              <i />
              <i />
            </div>
            <div className="terminal__body">
              <div>
                <span className="c-prompt">$ </span>
                <span className="c-cmd">git clone {GITHUB_URL}.git</span>
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
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
