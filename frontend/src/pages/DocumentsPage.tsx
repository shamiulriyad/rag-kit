import { useMemo, useRef, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, Search, FileText, X, FileWarning, Trash2, Star } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Field'
import StatusPill from '../components/ui/StatusPill'
import { useToast } from '../components/ui/Toast'
import UpgradeDialog from '../components/app/UpgradeDialog'
import DocTags from '../components/app/DocTags'
import { uploadPdf } from '../services/api'
import { mockDocuments, type DocRecord, type DocStatus } from '../lib/mockData'
import { formatBytes, relativeTime } from '../lib/format'
import { usePlan } from '../lib/plan'
import { useWorkspace } from '../lib/workspace'
import { useActivity } from '../lib/activity'
import { useNotifications } from '../lib/notifications'

const MAX_UPLOAD_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB ?? 200)

export default function DocumentsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { limits, isFree } = usePlan()
  const { tagsByDoc, allTags, isDocFavorite, toggleDoc } = useWorkspace()
  const { log } = useActivity()
  const { push } = useNotifications()
  const inputRef = useRef<HTMLInputElement>(null)
  const [docs, setDocs] = useState<DocRecord[]>(mockDocuments)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<DocStatus | 'all'>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [selected, setSelected] = useState<DocRecord | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const atDocLimit = isFree && docs.length >= limits.documents

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return docs.filter((d) => {
      const tags = tagsByDoc[d.id] ?? []
      const matchesQuery =
        !q ||
        d.name.toLowerCase().includes(q) ||
        tags.some((t) => t.toLowerCase().includes(q))
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter
      const matchesTag = !tagFilter || tags.includes(tagFilter)
      return matchesQuery && matchesStatus && matchesTag
    })
  }, [docs, query, statusFilter, tagFilter, tagsByDoc])

  async function ingest(file: File) {
    if (atDocLimit) {
      setUpgradeOpen(true)
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

    const tempId = `tmp_${Date.now()}`
    setDocs((d) => [
      {
        id: tempId,
        name: file.name,
        sizeBytes: file.size,
        pages: 0,
        chunks: 0,
        status: 'processing',
        uploadedAt: new Date().toISOString(),
      },
      ...d,
    ])
    setUploading(true)

    const finish = (pages: number, chunks: number, note?: string) => {
      setDocs((d) =>
        d.map((doc) =>
          doc.id === tempId ? { ...doc, status: 'ready', pages, chunks, note } : doc,
        ),
      )
      log('upload', `Uploaded ${file.name}`)
      push({
        type: 'doc_ready',
        title: 'Document processed',
        body: `${file.name} finished indexing — ${chunks.toLocaleString()} chunks.`,
      })
    }

    try {
      const res = await uploadPdf(file)
      finish(res.pages, res.chunks)
      toast('ok', `Indexed ${res.document} — ${res.pages} pages, ${res.chunks} chunks.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      const looksUnreachable = /reach the backend/i.test(message)
      if (looksUnreachable) {
        finish(
          Math.max(1, Math.round(file.size / 42000)),
          Math.max(1, Math.round(file.size / 12000)),
          'Simulated locally — the .NET API was unreachable.',
        )
        toast('ok', message)
      } else {
        setDocs((d) =>
          d.map((doc) =>
            doc.id === tempId ? { ...doc, status: 'failed', note: message } : doc,
          ),
        )
        push({
          type: 'doc_failed',
          title: 'Processing failed',
          body: `${file.name}: ${message}`,
        })
        toast('err', message)
      }
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

  function removeDoc(id: string) {
    const doc = docs.find((d) => d.id === id)
    setDocs((d) => d.filter((doc) => doc.id !== id))
    setSelected(null)
    if (doc) log('delete', `Deleted ${doc.name}`)
    toast('ok', 'Document removed from the workspace.')
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
          onClick={() => inputRef.current?.click()}
        >
          <UploadCloud size={15} />
          Choose file
        </Button>
      </div>

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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as DocStatus | 'all')}
          style={{ width: 180 }}
        >
          <option value="all">All statuses</option>
          <option value="ready">Ready</option>
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

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th />
              <th>Document</th>
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
                    aria-label={
                      isDocFavorite(d.id) ? 'Remove from favorites' : 'Add to favorites'
                    }
                    aria-pressed={isDocFavorite(d.id)}
                    onClick={() => toggleDoc(d.id)}
                  >
                    <Star
                      size={15}
                      fill={isDocFavorite(d.id) ? 'currentColor' : 'none'}
                    />
                  </button>
                </td>
                <td>
                  <span className="doc-name">
                    <span className="list__icon">
                      {d.status === 'failed' ? <FileWarning /> : <FileText />}
                    </span>
                    <span className="truncate">{d.name}</span>
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
                <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--sp-6)' }}>
                  No documents match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
              <dt>File size</dt>
              <dd>{formatBytes(selected.sizeBytes)}</dd>
              <dt>Pages</dt>
              <dd>{selected.pages || '—'}</dd>
              <dt>Chunks</dt>
              <dd>{selected.chunks || '—'}</dd>
              <dt>Uploaded</dt>
              <dd>{new Date(selected.uploadedAt).toLocaleString()}</dd>
              <dt>Collection</dt>
              <dd className="mono">rag_documents</dd>
            </dl>

            {selected.note && (
              <div className="secret-note">
                <FileWarning />
                <span>{selected.note}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'auto' }}>
              <Button
                variant="secondary"
                block
                onClick={() => toggleDoc(selected.id)}
              >
                <Star
                  size={15}
                  fill={isDocFavorite(selected.id) ? 'currentColor' : 'none'}
                />
                {isDocFavorite(selected.id) ? 'Favorited' : 'Favorite'}
              </Button>
              <Button variant="secondary" onClick={() => navigate('/chat')}>
                Ask
              </Button>
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
