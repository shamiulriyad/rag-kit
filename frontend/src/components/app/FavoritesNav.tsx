import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, FileText, Pin } from 'lucide-react'
import { useWorkspace } from '../../lib/workspace'
import {
  getDocument,
  getKnowledgeBase,
  type DocumentRecord,
  type KnowledgeBaseSummary,
} from '../../services/api'

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function FavoritesNav() {
  const { starredKbs, favoriteDocs, pinnedConversations } = useWorkspace()
  const [kbs, setKbs] = useState<KnowledgeBaseSummary[]>([])
  const [docs, setDocs] = useState<DocumentRecord[]>([])

  // Fetched individually by id (not from a list) so starring one item doesn't require
  // loading every Knowledge Base/document just to resolve a name for the sidebar.
  useEffect(() => {
    if (starredKbs.length === 0) {
      setKbs([])
      return
    }
    let cancelled = false
    Promise.all(
      starredKbs.filter((id) => GUID_RE.test(id)).map((id) => getKnowledgeBase(id).catch(() => null)),
    ).then((results) => {
      if (!cancelled) setKbs(results.filter((k): k is KnowledgeBaseSummary => k !== null))
    })
    return () => {
      cancelled = true
    }
  }, [starredKbs])

  useEffect(() => {
    if (favoriteDocs.length === 0) {
      setDocs([])
      return
    }
    let cancelled = false
    Promise.all(
      // Only real (GUID) ids exist on the API; skip leftover sample ids to avoid 404s.
      favoriteDocs.filter((id) => GUID_RE.test(id)).map((id) => getDocument(id).catch(() => null)),
    ).then((results) => {
      if (!cancelled) setDocs(results.filter((d): d is DocumentRecord => d !== null))
    })
    return () => {
      cancelled = true
    }
  }, [favoriteDocs])

  const empty = kbs.length === 0 && docs.length === 0 && pinnedConversations.length === 0

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
            <Link key={k.id} to={`/knowledge-bases/${k.id}`} className="favnav__item">
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
            <Link key={c.id} to={`/chat?conversation=${c.id}`} className="favnav__item">
              <Pin />
              <span className="truncate">{c.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
