import { useRef, useState } from 'react'
import { uploadPdf, type UploadResponse } from '../services/api'

interface Props {
  onIngested: (result: UploadResponse) => void
}

// Keep in step with MAX_UPLOAD_MB / Upload__MaxBytes on the servers.
const MAX_UPLOAD_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB ?? 200)

export default function FileUpload({ onIngested }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload() {
    if (!file) return

    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(
        `That PDF is ${(file.size / 1024 / 1024).toFixed(0)} MB. The limit is ${MAX_UPLOAD_MB} MB — ` +
          `raise MAX_UPLOAD_MB / Upload__MaxBytes, or split the file.`,
      )
      return
    }

    setBusy(true)
    setError(null)
    try {
      const result = await uploadPdf(file)
      onIngested(result)
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel">
      <h2>Upload Document</h2>
      <div className="row">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          disabled={busy}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button onClick={handleUpload} disabled={!file || busy}>
          {busy ? 'Indexing…' : 'Upload'}
        </button>
      </div>
      <p className="hint">
        Text-based PDF, up to {MAX_UPLOAD_MB} MB. Scanned/image PDFs need OCR first.
      </p>
      {busy && (
        <p className="hint">
          Extracting, chunking and embedding — a large PDF can take a few minutes.
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  )
}
