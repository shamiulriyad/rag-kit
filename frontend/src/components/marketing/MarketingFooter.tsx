import { Link } from 'react-router-dom'
import Logo from '../ui/Logo'

const COLS: { title: string; links: { label: string; to: string; ext?: boolean }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', to: '/#features' },
      { label: 'How It Works', to: '/#how' },
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Knowledge Chat', to: '/chat' },
    ],
  },
  {
    title: 'Documentation',
    links: [
      { label: 'Getting Started', to: '/docs' },
      { label: 'RAG Pipeline', to: '/docs' },
      { label: 'Configuration', to: '/docs' },
      { label: 'Troubleshooting', to: '/docs' },
    ],
  },
  {
    title: 'Architecture',
    links: [
      { label: 'Overview', to: '/#architecture' },
      { label: 'Backend Connection', to: '/docs' },
      { label: 'Frontend Connection', to: '/docs' },
      { label: 'Qdrant', to: '/docs' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'GitHub', to: 'https://github.com/your-org/rag-starter', ext: true },
      { label: 'Qdrant Docs', to: 'https://qdrant.tech/documentation/', ext: true },
      { label: 'Gemini API', to: 'https://ai.google.dev/', ext: true },
      { label: 'License (MIT)', to: 'https://opensource.org/license/mit', ext: true },
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
              A modular, developer-friendly RAG starter that lets you clone,
              configure, ingest your documents, and start asking questions.
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
          <span>© {new Date().getFullYear()} RAG Starter. Released under the MIT License.</span>
          <span>Clone. Configure. Ingest. Ask.</span>
        </div>
      </div>
    </footer>
  )
}
