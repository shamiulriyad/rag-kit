import { useState } from 'react'
import { askQuestion } from '../services/api'
import Message, { type ChatMessage } from './Message'

export default function ChatBox() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    const q = question.trim()
    if (!q || busy) return

    setError(null)
    setBusy(true)
    setMessages((m) => [...m, { role: 'user', text: q }])
    setQuestion('')

    try {
      const res = await askQuestion(q)
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: res.answer, sources: res.sources },
      ])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel">
      <h2>Ask a Question</h2>
      <div className="row">
        <input
          type="text"
          value={question}
          placeholder="What does the document say about…?"
          disabled={busy}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send()
          }}
        />
        <button onClick={send} disabled={busy || !question.trim()}>
          {busy ? '…' : 'Send'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="messages">
        {messages.length === 0 && (
          <p className="hint">Upload a PDF, then ask something about it.</p>
        )}
        {messages.map((m, i) => (
          <Message key={i} message={m} />
        ))}
      </div>
    </section>
  )
}
