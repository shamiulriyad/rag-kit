import { Fragment } from 'react'
import { ArrowDown, ScrollText } from 'lucide-react'

const ARCH_LAYERS = [
  { name: 'React', body: 'The UI. Talks only to the .NET API over HTTP/JSON.' },
  {
    name: 'ASP.NET Core API',
    body: 'The gateway. Validates uploads, enforces limits, forwards requests.',
  },
  {
    name: 'Python RAG Engine',
    body: 'Extraction, cleaning, chunking, embedding, retrieval and prompt assembly.',
  },
]

export default function ArchitectureDiagram({ note = true }: { note?: boolean }) {
  return (
    <>
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
      {note && (
        <div className="arch__note" style={{ marginTop: 'var(--sp-6)' }}>
          <ScrollText />
          <span>
            The React frontend talks only to the .NET API, never to Python directly. The hosted
            SaaS runs this exact architecture for you — self-hosting means running it yourself.
          </span>
        </div>
      )}
    </>
  )
}
