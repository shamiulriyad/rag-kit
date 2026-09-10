import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Markdown } from '../lib/markdown'
import { docsPages } from '../lib/docsContent'

const IDS = docsPages.map((p) => p.id)

export default function DocsPage() {
  const location = useLocation()
  const navigate = useNavigate()

  // The active topic is derived from the URL hash — so /docs#configuration
  // (e.g. from the footer) deep-links straight to that topic, and browser
  // back/forward moves between topics.
  const hashId = decodeURIComponent(location.hash.replace('#', ''))
  const activeId = IDS.includes(hashId) ? hashId : docsPages[0].id

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeId])

  const index = docsPages.findIndex((p) => p.id === activeId)
  const page = docsPages[index]
  const prev = docsPages[index - 1]
  const next = docsPages[index + 1]

  const go = (id: string) => navigate(`/docs#${id}`)

  return (
    <div className="page">
      <div className="docs-grid">
        <nav className="docs-nav scroll">
          {docsPages.map((p) => (
            <button
              key={p.id}
              aria-current={p.id === activeId}
              onClick={() => go(p.id)}
            >
              {p.title}
            </button>
          ))}
        </nav>

        <article className="docs-content" id={page.id}>
          <span className="eyebrow">Documentation</span>
          <h1>{page.title}</h1>
          <Markdown content={page.body} />

          <div className="docs-pager">
            {prev ? (
              <button className="btn btn--secondary btn--sm" onClick={() => go(prev.id)}>
                <ChevronLeft size={14} />
                {prev.title}
              </button>
            ) : (
              <span />
            )}
            {next ? (
              <button className="btn btn--secondary btn--sm" onClick={() => go(next.id)}>
                {next.title}
                <ChevronRight size={14} />
              </button>
            ) : (
              <span />
            )}
          </div>
        </article>
      </div>
    </div>
  )
}
