import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Markdown } from '../lib/markdown'
import { docsPages } from '../lib/docsContent'

export default function DocsPage() {
  const [activeId, setActiveId] = useState(docsPages[0].id)
  const index = docsPages.findIndex((p) => p.id === activeId)
  const page = docsPages[index]
  const prev = docsPages[index - 1]
  const next = docsPages[index + 1]

  function go(id: string) {
    setActiveId(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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

        <article className="docs-content">
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
