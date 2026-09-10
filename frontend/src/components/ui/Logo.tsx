import { Link } from 'react-router-dom'
import { Layers } from 'lucide-react'

export default function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="logo" aria-label="RAG Starter home">
      <span className="logo__mark">
        <Layers strokeWidth={2.4} />
      </span>
      RAG Starter
    </Link>
  )
}
