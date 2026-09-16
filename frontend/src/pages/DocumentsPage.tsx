import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { UploadCloud, Search, FileText, X, FileWarning, Trash2, Star, Database, RotateCcw } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Field'
import StatusPill from '../components/ui/StatusPill'
import { useToast } from '../components/ui/Toast'
import UpgradeDialog from '../components/app/UpgradeDialog'
import DocTags from '../components/app/DocTags'
import {
  ApiError,
  deleteDocument,
  getDocument,
  listDocuments,
  listKnowledgeBases,
  reprocessDocument,
  uploadDocument,
  type DocumentRecord,
  type KnowledgeBaseSummary,
} from '../services/api'
import { formatBytes, relativeTime } from '../lib/format'
import { usePlan } from '../lib/plan'
import { useWorkspace } from '../lib/workspace'
import { useActivity } from '../lib/activity'
import { useNotifications } from '../lib/notifications'

const MAX_UPLOAD_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB ?? 200)
const TERMINAL_STATUSES = new Set(['completed', 'failed'])

function friendlyError(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback
}

export default function DocumentsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { limits, isFree } = usePlan()
  const { tagsByDoc, allTags, isDocFavorite, toggleDoc } = useWorkspace()
  const { log } = useActivity()
  const { push } = useNotifications()
  const inputRef = useRef<HTMLInputElement>(null)

  const [kbs, setKbs] = useState<KnowledgeBaseSummary[]>([])
  const [docs, setDocs] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [kbFilter, setKbFilter] = useState<string>(params.get('kb') ?? 'all')
  const [selected, setSelected] = useState<DocumentRecord | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    listKnowledgeBases()
      .then(async (kbList) => {
        if (cancelled) return
        setKbs(kbList)
        const perKb = await Promise.all(kbList.map((kb) => listDocuments(kb.id)))
        if (cancelled) return
        setDocs(perKb.flat())
      })
      .catch((err) => {
        if (!cancelled) setLoadError(friendlyError(err, 'Could not load your documents.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const kbName = (id: string) => kbs.find((k) => k.id === id)?.name ?? 'Unassigned'

  const atDocLimit = isFree && docs.length >= limits.documents
  const defaultKbForUpload = kbFilter !== 'all' ? kbFilter : kbs[0]?.id

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return docs.filter((d) => {
      const tags = tagsByDoc[d.id] ?? []
      const matchesQuery =
        !q || d.name.toLowerCase().includes(q) || tags.some((t) => t.toLowerCase().includes(q))
      const matchesStatus = statusFilter === 'all' || d.status.toLowerCase() === statusFilter
      const matchesTag = !tagFilter || tags.includes(tagFilter)
      const matchesKb = kbFilter === 'all' || d.knowledgeBaseId === kbFilter
      return matchesQuery && matchesStatus && matchesTag && matchesKb
    })
  }, [docs, query, statusFilter, tagFilter, kbFilter, tagsByDoc])

  // Backend processing is async (queued -> processing -> completed/failed) - poll the
  // just-touched document until it reaches a terminal state instead of leaving the row stuck.
  function pollUntilDone(id: string, attempts = 40) {
    if (attempts <= 0) return
    setTimeout(async () => {
      try {
        const doc = await getDocument(id)
        setDocs((d) => d.map((x) => (x.id === id ? doc : x)))
        setSelected((s) => (s?.id === id ? doc : s))
        if (!TERMINAL_STATUSES.has(doc.status.toLowerCase())) {
          pollUntilDone(id, attempts - 1)
          return
        }
        if (doc.status.toLowerCase() === 'completed') {
          log('upload', `Uploaded ${doc.name}`)
          push({
            type: 'doc_ready',
            title: 'Document processed',
            body: `${doc.name} finished indexing — ${doc.chunks ?? 0} chunks.`,
          })
        } else {
          push({
            type: 'doc_failed',
            title: 'Processing failed',
            body: `${doc.name}: ${doc.note ?? 'Processing failed.'}`,
          })
        }
      } catch {
        // Transient poll failure - just stop; the row keeps its last known status and the
        // user can reload the page to see the latest.
      }
    }, 3000)
  }

  async function ingest(file: File) {
    if (atDocLimit) {
      setUpgradeOpen(true)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    if (!defaultKbForUpload) {
      toast('err', 'Create a Knowledge Base first.')
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast('err', 'Only PDF files can be ingested.')
      return
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      toast('err', `That PDF is ${formatBytes(file.size)}. The limit is ${MAX_UPLOAD_MB} MB.`)
      return
    }

    setUploading(true)
    try {
      const doc = await uploadDocument(defaultKbForUpload, file)
      setDocs((d) => [doc, ...d])
      toast('ok', `"${doc.name}" uploaded — processing in the background.`)
      pollUntilDone(doc.id)
    } catch (err) {
      toast('err', friendlyError(err, 'Upload failed.'))
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) ingest(file)
  }

  async function removeDoc(id: string) {
    const doc = docs.find((d) => d.id === id)
    try {
      await deleteDocument(id)
      setDocs((d) => d.filter((x) => x.id !== id))
      setSelected(null)
      if (doc) log('delete', `Deleted ${doc.name}`)
      toast('ok', 'Document deleted.')
    } catch (err) {
      toast('err', friendlyError(err, 'Could not delete this document.'))
    }
  }

  async function retryDoc(id: string) {
    try {
      const doc = await reprocessDocument(id)
      setDocs((d) => d.map((x) => (x.id === id ? doc : x)))
      setSelected((s) => (s?.id === id ? doc : s))
      toast('ok', 'Reprocessing started.')
      pollUntilDone(id)
    } catch (err) {
      toast('err', friendlyError(err, 'Could not reprocess this document.'))
    }
  }

  return (
    <div className="page">
      <div
        className={`dropzone${dragOver ? ' dropzone--over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <span className="dropzone__icon">
          <UploadCloud />
        </span>
        <h3>Drag &amp; drop a PDF to ingest</h3>
        <p className="muted">
          Text-based PDF, up to {MAX_UPLOAD_MB} MB. Scanned / image-only PDFs need
          OCR first. The file is sent to the .NET API, which forwards it to the
          Python RAG pipeline.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) ingest(f)
          }}
        />
        <Button
          variant="secondary"
          loading={uploading}
          disabled={!loading && kbs.length === 0}
          onClick={() => inputRef.current?.click()}
        >
          <UploadCloud size={15} />
          Choose file
        </Button>
      </div>

      {!loading && kbs.length === 0 && (
        <div className="secret-note">
          <Database />
          <span>
            You don't have a Knowledge Base yet.{' '}
            <button className="btn btn--ghost btn--sm" onClick={() => navigate('/knowledge-bases')}>
              Create one
            </button>{' '}
            before uploading documents.
          </span>
        </div>
      )}

      <div className="toolbar">
        <div className="search">
          <Search />
          <input
            className="input"
            placeholder="Search by name or tag…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select
          value={kbFilter}
          onChange={(e) => {
            const v = e.target.value
            setKbFilter(v)
            setParams(v === 'all' ? {} : { kb: v }, { replace: true })
          }}
          style={{ width: 200 }}
        >
          <option value="all">All Knowledge Bases</option>
          {kbs.map((kb) => (
            <option key={kb.id} value={kb.id}>
              {kb.name}
            </option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 180 }}>
          <option value="all">All statuses</option>
          <option value="completed">Ready</option>
          <option value="queued">Queued</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
        </Select>
        {isFree && (
          <span className={`usage-chip${atDocLimit ? ' usage-chip--full' : ''}`}>
            <FileText size={14} />
            <b>
              {docs.length} / {limits.documents}
            </b>{' '}
            documents · Free plan
          </span>
        )}
      </div>

      <div className="tags">
        <button
          className="tag tag--filter"
          aria-pressed={tagFilter === null}
          onClick={() => setTagFilter(null)}
        >
          All tags
        </button>
        {allTags.map((t) => (
          <button
            key={t}
            className="tag tag--filter"
            aria-pressed={tagFilter === t}
            onClick={() => setTagFilter((cur) => (cur === t ? null : t))}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="state">
          <span className="spinner" />
        </div>
      ) : loadError ? (
        <div className="state state--error">
          <span className="state__icon">
            <FileWarning />
          </span>
          <h3>Couldn't load your documents</h3>
          <p className="muted">{loadError}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th />
                <th>Document</th>
                <th>Knowledge Base</th>
                <th>Tags</th>
                <th>Size</th>
                <th>Pages</th>
                <th>Chunks</th>
                <th>Uploaded</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} onClick={() => setSelected(d)}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      className="starbtn"
                      aria-label={isDocFavorite(d.id) ? 'Remove from favorites' : 'Add to favorites'}
                      aria-pressed={isDocFavorite(d.id)}
                      onClick={() => toggleDoc(d.id)}
                    >
                      <Star size={15} fill={isDocFavorite(d.id) ? 'currentColor' : 'none'} />
                    </button>
                  </td>
                  <td>
                    <span className="doc-name">
                      <span className="list__icon">
                        {d.status.toLowerCase() === 'failed' ? <FileWarning /> : <FileText />}
                      </span>
                      <span className="truncate">{d.name}</span>
                    </span>
                  </td>
                  <td>
                    <span
                      className="list__meta"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Database size={13} />
                      {kbName(d.knowledgeBaseId)}
                    </span>
                  </td>
                  <td>
                    {(tagsByDoc[d.id] ?? []).length === 0 ? (
                      <span className="list__meta">—</span>
                    ) : (
                      <span className="tags">
                        {(tagsByDoc[d.id] ?? []).map((t) => (
                          <span key={t} className="tag">
                            {t}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td>{formatBytes(d.sizeBytes)}</td>
                  <td>{d.pages || '—'}</td>
                  <td>{d.chunks || '—'}</td>
                  <td>{relativeTime(d.uploadedAt)}</td>
                  <td>
                    <StatusPill status={d.status} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 'var(--sp-6)' }}>
                    No documents match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="drawer-scrim" onClick={() => setSelected(null)}>
          <div className="drawer scroll" onClick={(e) => e.stopPropagation()}>
            <div className="drawer__head">
              <div>
                <h3>{selected.name}</h3>
                <StatusPill status={selected.status} />
              </div>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <div className="field__label" style={{ marginBottom: 8 }}>
                Tags
              </div>
              <DocTags docId={selected.id} />
            </div>

            <dl className="kv">
              <dt>Document ID</dt>
              <dd className="mono">{selected.id}</dd>
              <dt>Knowledge Base</dt>
              <dd>{kbName(selected.knowledgeBaseId)}</dd>
              <dt>File size</dt>
              <dd>{formatBytes(selected.sizeBytes)}</dd>
              <dt>Pages</dt>
              <dd>{selected.pages || '—'}</dd>
              <dt>Chunks</dt>
              <dd>{selected.chunks || '—'}</dd>
              <dt>Uploaded</dt>
              <dd>{new Date(selected.uploadedAt).toLocaleString()}</dd>
            </dl>

            {selected.note && (
              <div className="secret-note">
                <FileWarning />
                <span>{selected.note}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'auto', flexWrap: 'wrap' }}>
              <Button variant="secondary" block onClick={() => toggleDoc(selected.id)}>
                <Star size={15} fill={isDocFavorite(selected.id) ? 'currentColor' : 'none'} />
                {isDocFavorite(selected.id) ? 'Favorited' : 'Favorite'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(`/chat?kb=${selected.knowledgeBaseId}`)}
              >
                Ask
              </Button>
              {selected.status.toLowerCase() === 'failed' && (
                <Button variant="secondary" onClick={() => retryDoc(selected.id)}>
                  <RotateCcw size={15} />
                  Reprocess
                </Button>
              )}
              <Button variant="danger" onClick={() => removeDoc(selected.id)}>
                <Trash2 size={15} />
              </Button>
            </div>
          </div>
        </div>
      )}

      <UpgradeDialog
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        title="You've reached your document limit."
        usage={`${docs.length} / ${limits.documents} documents`}
        message="Upgrade to Pro to add up to 50 documents, 10 GB of storage and 100,000 chunks."
      />
    </div>
  )
}
