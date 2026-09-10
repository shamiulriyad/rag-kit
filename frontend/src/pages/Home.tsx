import { useEffect, useState } from 'react'
import FileUpload from '../components/FileUpload'
import ChatBox from '../components/ChatBox'
import { checkHealth, type UploadResponse } from '../services/api'

export default function Home() {
  const [status, setStatus] = useState('checking…')
  const [lastUpload, setLastUpload] = useState<UploadResponse | null>(null)

  useEffect(() => {
    checkHealth()
      .then((h) =>
        setStatus(h.rag === 'ok' ? 'connected' : 'backend up · RAG service down'),
      )
      .catch(() => setStatus('backend unreachable'))
  }, [])

  const ok = status === 'connected'

  return (
    <main className="app">
      <header className="app__header">
        <h1>RAG Starter</h1>
        <span className={`status status--${ok ? 'ok' : 'bad'}`}>{status}</span>
      </header>

      <FileUpload onIngested={setLastUpload} />

      {lastUpload && (
        <p className="notice">
          Indexed <strong>{lastUpload.document}</strong> — {lastUpload.pages} pages,{' '}
          {lastUpload.chunks} chunks.
        </p>
      )}

      <ChatBox />
    </main>
  )
}
