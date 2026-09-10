import type { Source } from '../services/api'

export default function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null

  return (
    <div className="sources">
      <div className="sources__title">Sources</div>
      <ul>
        {sources.map((s, i) => (
          <li key={i}>
            {s.document}
            {s.page != null ? ` — page ${s.page}` : ''}
            <span className="sources__score"> (score {s.score.toFixed(3)})</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
