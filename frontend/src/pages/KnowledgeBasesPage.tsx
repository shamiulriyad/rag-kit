import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Database,
  Plus,
  Star,
  MoreHorizontal,
  Pencil,
  Settings2,
  Trash2,
  FileText,
  Boxes,
} from 'lucide-react'
import { useToast } from '../components/ui/Toast'
import CreateKbModal from '../components/app/CreateKbModal'
import UpgradeDialog from '../components/app/UpgradeDialog'
import { useDismiss } from '../lib/hooks'
import {
  ApiError,
  createKnowledgeBase,
  deleteKnowledgeBase,
  listKnowledgeBases,
  updateKnowledgeBase,
  type KnowledgeBaseSummary,
} from '../services/api'
import { formatNumber, relativeTime } from '../lib/format'
import { useWorkspace } from '../lib/workspace'
import { usePlan } from '../lib/plan'
import { useActivity } from '../lib/activity'

function friendlyError(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback
}

function KbMenu({
  kb,
  onRename,
  onDelete,
}: {
  kb: KnowledgeBaseSummary
  onRename: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false))

  return (
    <div className="popover" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        className="iconbtn"
        aria-label="Knowledge base actions"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="popover__panel menu" role="menu">
          <button className="menu__item" onClick={() => { setOpen(false); navigate(`/knowledge-bases/${kb.id}`) }}>
            <Database size={15} />
            Open
          </button>
          <button className="menu__item" onClick={() => { setOpen(false); onRename() }}>
            <Pencil size={15} />
            Rename
          </button>
          <button className="menu__item" onClick={() => { setOpen(false); navigate(`/knowledge-bases/${kb.id}?tab=settings`) }}>
            <Settings2 size={15} />
            Settings
          </button>
          <button className="menu__item menu__item--danger" onClick={() => { setOpen(false); onDelete() }}>
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default function KnowledgeBasesPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { isKbStarred, toggleKb } = useWorkspace()
  const { log } = useActivity()
  const { limits, isFree } = usePlan()
  const [kbs, setKbs] = useState<KnowledgeBaseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const atKbLimit = isFree && kbs.length >= limits.knowledgeBases

  useEffect(() => {
    listKnowledgeBases()
      .then(setKbs)
      .catch((err) => setError(friendlyError(err, 'Could not load your Knowledge Bases.')))
      .finally(() => setLoading(false))
  }, [])

  function requestCreate() {
    if (atKbLimit) {
      setUpgradeOpen(true)
      return
    }
    setCreateOpen(true)
  }

  async function createKb(name: string, description: string) {
    const kb = await createKnowledgeBase(name, description)
    setKbs((k) => [kb, ...k])
    log('kb_created', `Created the ${name} Knowledge Base`)
    toast('ok', `Created "${name}".`)
  }

  async function renameKb(kb: KnowledgeBaseSummary) {
    const name = window.prompt('Rename knowledge base', kb.name)
    if (!name?.trim() || name.trim() === kb.name) return
    try {
      const updated = await updateKnowledgeBase(kb.id, { name: name.trim() })
      setKbs((k) => k.map((x) => (x.id === kb.id ? updated : x)))
      toast('ok', 'Renamed.')
    } catch (err) {
      toast('err', friendlyError(err, 'Could not rename this Knowledge Base.'))
    }
  }

  async function deleteKb(kb: KnowledgeBaseSummary) {
    if (!window.confirm(`Delete "${kb.name}"? This cannot be undone.`)) return
    try {
      await deleteKnowledgeBase(kb.id)
      setKbs((k) => k.filter((x) => x.id !== kb.id))
      toast('ok', `Deleted "${kb.name}".`)
    } catch (err) {
      toast('err', friendlyError(err, 'Could not delete this Knowledge Base.'))
    }
  }

  return (
    <div className="page">
      <div className="toolbar">
        <div>
          <h3 style={{ margin: 0 }}>Knowledge Bases</h3>
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            {kbs.length} knowledge base{kbs.length === 1 ? '' : 's'}
          </p>
        </div>
        <button className="btn btn--primary" onClick={requestCreate}>
          <Plus size={15} />
          Create Knowledge Base
        </button>
      </div>

      {isFree && (
        <span className={`usage-chip${atKbLimit ? ' usage-chip--full' : ''}`}>
          <Database size={14} />
          <b>
            {kbs.length} / {limits.knowledgeBases}
          </b>{' '}
          knowledge bases · Free plan
        </span>
      )}

      {loading ? (
        <div className="state">
          <span className="spinner" />
        </div>
      ) : error ? (
        <div className="state state--error">
          <span className="state__icon">
            <Database />
          </span>
          <h3>Couldn't load your Knowledge Bases</h3>
          <p className="muted">{error}</p>
        </div>
      ) : kbs.length === 0 ? (
        <div className="state">
          <span className="state__icon">
            <Database />
          </span>
          <h3>No knowledge bases yet</h3>
          <p className="muted">Create one to start uploading documents and asking questions.</p>
        </div>
      ) : (
        <div className="kb-grid">
          {kbs.map((kb) => (
            <article
              key={kb.id}
              className="card kb-card"
              onClick={() => navigate(`/knowledge-bases/${kb.id}`)}
            >
              <div className="kb-card__head">
                <span className="list__icon">
                  <Database />
                </span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <h4 className="truncate">{kb.name}</h4>
                  <p className="muted truncate" style={{ fontSize: '0.82rem', margin: 0 }}>
                    {kb.description || 'No description yet.'}
                  </p>
                </div>
                <button
                  className="starbtn"
                  aria-label={isKbStarred(kb.id) ? 'Unstar' : 'Star'}
                  aria-pressed={isKbStarred(kb.id)}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleKb(kb.id)
                  }}
                >
                  <Star size={15} fill={isKbStarred(kb.id) ? 'currentColor' : 'none'} />
                </button>
                <KbMenu kb={kb} onRename={() => renameKb(kb)} onDelete={() => deleteKb(kb)} />
              </div>

              <div className="kb-card__stats">
                <div>
                  <FileText size={14} />
                  <span>{kb.documents} docs</span>
                </div>
                <div>
                  <Boxes size={14} />
                  <span>{formatNumber(kb.chunks)} chunks</span>
                </div>
              </div>

              <div className="kb-card__foot">
                {kb.role !== 'Owner' && <span className="pill">{kb.role}</span>}
                <span className="list__meta">Updated {relativeTime(kb.updatedAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      <CreateKbModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createKb} />

      <UpgradeDialog
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        title="You've reached your Knowledge Base limit."
        usage={`${kbs.length} / ${limits.knowledgeBases} knowledge bases`}
        message="Upgrade to Pro to create up to 10 Knowledge Bases."
      />
    </div>
  )
}
