import type { ReactNode } from 'react'
import { CheckCircle2 } from 'lucide-react'
import Logo from '../ui/Logo'

const POINTS = [
  'Drag-and-drop PDF ingestion with live status',
  'Source-aware answers — document + page on every response',
  'Qdrant server mode, configurable models, no lock-ups',
]

export default function AuthScaffold({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth__aside">
        <Logo />
        <div className="auth__pitch">
          <span className="eyebrow">RAG Starter</span>
          <h2>Build RAG Systems. Without Starting From Zero.</h2>
          <p>
            Clone, configure, ingest your documents, and start asking questions —
            with a workspace that feels like a real product.
          </p>
          <div className="auth__points">
            {POINTS.map((p) => (
              <div className="auth__point" key={p}>
                <CheckCircle2 />
                {p}
              </div>
            ))}
          </div>
        </div>
        <p className="muted" style={{ fontSize: '0.8rem' }}>
          Clone. Configure. Ingest. Ask.
        </p>
      </aside>

      <main className="auth__main">{children}</main>
    </div>
  )
}
