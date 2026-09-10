import { Link } from 'react-router-dom'
import { Star, FileText, Pin } from 'lucide-react'
import { useWorkspace } from '../../lib/workspace'
import { mockKnowledgeBases } from '../../lib/appData'
import { mockDocuments } from '../../lib/mockData'

export default function FavoritesNav() {
  const { starredKbs, favoriteDocs, pinnedConversations } = useWorkspace()

  const kbs = mockKnowledgeBases.filter((k) => starredKbs.includes(k.id))
  const docs = mockDocuments.filter((d) => favoriteDocs.includes(d.id))
  const empty =
    kbs.length === 0 && docs.length === 0 && pinnedConversations.length === 0

  return (
    <div>
      <div className="sidebar__section">Favorites</div>
      {empty ? (
        <div className="favnav__empty">
          Star a knowledge base or document to pin it here.
        </div>
      ) : (
        <div className="favnav">
          {kbs.map((k) => (
            <Link key={k.id} to="/dashboard" className="favnav__item">
              <Star fill="currentColor" />
              <span className="truncate">{k.name}</span>
            </Link>
          ))}
          {docs.map((d) => (
            <Link key={d.id} to="/documents" className="favnav__item">
              <FileText />
              <span className="truncate">{d.name}</span>
            </Link>
          ))}
          {pinnedConversations.map((c) => (
            <Link key={c.id} to="/chat" className="favnav__item">
              <Pin />
              <span className="truncate">{c.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
