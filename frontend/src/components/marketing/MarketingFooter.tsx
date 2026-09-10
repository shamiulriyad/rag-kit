import { Link } from 'react-router-dom'
import Logo from '../ui/Logo'

const GH = 'https://github.com/shamiulriyad/rag-kit'

const COLS: { title: string; links: { label: string; to: string; ext?: boolean }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', to: '/#features' },
      { label: 'Pricing', to: '/#pricing' },
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Playground', to: '/playground' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', to: '/docs' },
      { label: 'Getting Started', to: '/docs#getting-started' },
      { label: 'Architecture', to: '/docs#architecture' },
      { label: 'FAQ', to: '/#faq' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'GitHub', to: GH, ext: true },
      { label: 'Issues', to: `${GH}/issues`, ext: true },
      { label: 'Discussions', to: `${GH}/discussions`, ext: true },
    ],
  },
  {
    title: 'Project',
    links: [
      { label: 'Changelog', to: `${GH}/releases`, ext: true },
      { label: 'Roadmap', to: `${GH}/milestones`, ext: true },
      { label: 'License (MIT)', to: `${GH}/blob/main/LICENSE`, ext: true },
    ],
  },
]

export default function MarketingFooter() {
  return (
    <footer className="mfooter">
      <div className="container">
        <div className="mfooter__grid">
          <div className="mfooter__brand">
            <Logo />
            <p>
              <strong style={{ color: 'var(--text)' }}>RAG Starter</strong>
              <br />
              Build RAG Systems. Without Starting From Zero.
            </p>
          </div>
          {COLS.map((col) => (
            <div className="mfooter__col" key={col.title}>
              <h4>{col.title}</h4>
              {col.links.map((l) =>
                l.ext ? (
                  <a
                    key={l.label}
                    href={l.to}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {l.label}
                  </a>
                ) : (
                  <Link key={l.label} to={l.to}>
                    {l.label}
                  </Link>
                ),
              )}
            </div>
          ))}
        </div>
        <div className="mfooter__bottom">
          <span>
            © {new Date().getFullYear()} RAG Starter. Released under the MIT
            License.
          </span>
          <span>Clone. Configure. Ingest. Ask.</span>
        </div>
      </div>
    </footer>
  )
}
