import { useMemo, useRef, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UploadCloud,
  Search,
  FileText,
  X,
  FileWarning,
  Trash2,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Field'
import StatusPill from '../components/ui/StatusPill'
import { useToast } from '../components/ui/Toast'
import { uploadPdf } from '../services/api'
import { mockDocuments, type DocRecord, type DocStatus } from '../lib/mockData'
import { formatBytes, relativeTime } from '../lib/format'

const MAX_UPLOAD_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB ?? 200)

export default function DocumentsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [docs, setDocs] = useState<DocRecord[]>(mockDocuments)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<DocStatus | 'all'>('all')
  const [selected, setSelected] = useState<DocRecord | null>(null)

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      const matchesQuery = d.name.toLowerCase().includes(query.trim().toLowerCase())
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [docs, query, statusFilter])

  async function ingest(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast('err', 'Only PDF files can be ingested.')
      return
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      toast(
        'err',
        `That PDF is ${formatBytes(file.size)}. The limit is ${MAX_UPLOAD_MB} MB.`,
      )
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

    try {
      const res = await uploadPdf(file)
      setDocs((d) =>
        d.map((doc) =>
          doc.id === tempId
            ? {
                ...doc,
                status: 'ready',
                pages: res.pages,
                chunks: res.chunks,
              }
            : doc,
        ),
      )
      toast('ok', `Indexed ${res.document} — ${res.pages} pages, ${res.chunks} chunks.`)
    } catch (err) {
      // Backend not running in this environment — simulate a completed ingest
      // so the UI flow stays demonstrable, but surface the real reason.
      const message = err instanceof Error ? err.message : 'Upload failed'
      const looksUnreachable = /reach the backend/i.test(message)
      setDocs((d) =>
        d.map((doc) =>
          doc.id === tempId
            ? looksUnreachable
              ? {
                  ...doc,
                  status: 'ready',
                  pages: Math.max(1, Math.round(file.size / 42000)),
                  chunks: Math.max(1, Math.round(file.size / 12000)),
                  note: 'Simulated locally — the .NET API was unreachable.',
                }
              : { ...doc, status: 'failed', note: message }
            : doc,
        ),
      )
      toast(looksUnreachable ? 'ok' : 'err', message)
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
    setDocs((d) => d.filter((doc) => doc.id !== id))
    setSelected(null)
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
            placeholder="Search documents…"
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
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Document</th>
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
                <td>
                  <span className="doc-name">
                    <span className="list__icon">
                      {d.status === 'failed' ? <FileWarning /> : <FileText />}
                    </span>
                    <span className="truncate">{d.name}</span>
                  </span>
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
                <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--sp-6)' }}>
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
              <Button variant="secondary" block onClick={() => navigate('/chat')}>
                Ask about this document
              </Button>
              <Button variant="danger" onClick={() => removeDoc(selected.id)}>
                <Trash2 size={15} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
