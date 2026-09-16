import { Link } from 'react-router-dom'
import { KeyRound, Plus, Trash2, BookOpen, Webhook, PackageOpen, Terminal } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { GithubIcon } from '../components/ui/icons'
import { useLocalStorage } from '../lib/hooks'
import { questionsThisMonth } from '../lib/mockData'
import { formatNumber } from '../lib/format'

interface ApiKey {
  id: string
  label: string
  key: string
  createdAt: string
}

function maskKey(key: string) {
  return `${key.slice(0, 8)}${'•'.repeat(20)}${key.slice(-4)}`
}

function genKey() {
  return `rsk_${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
}

export default function DeveloperPortalPage() {
  const toast = useToast()
  const [keys, setKeys] = useLocalStorage<ApiKey[]>('rag-starter.dev.keys', [])

  function createKey() {
    const label = window.prompt('Name this API key (e.g. "Local dev")')
    if (!label?.trim()) return
    const key: ApiKey = {
      id: `key_${Date.now()}`,
      label: label.trim(),
      key: genKey(),
      createdAt: new Date().toISOString(),
    }
    setKeys((k) => [key, ...k])
    toast('ok', 'API key created. Demo only — it is not wired to a real backend yet.')
  }

  function revokeKey(id: string) {
    if (!window.confirm('Revoke this API key?')) return
    setKeys((k) => k.filter((x) => x.id !== id))
    toast('ok', 'Key revoked.')
  }

  return (
    <div className="page dxpage">
      <div className="secret-note">
        <Terminal />
        <span>
          The Developer Portal is for building against RAG Starter programmatically. It's
          separate from the customer-facing app pages — API access, self-hosting, and the raw
          pipeline live here.
        </span>
      </div>

      <section className="card">
        <div className="panel-head">
          <h3>API Keys</h3>
          <Button onClick={createKey}>
            <Plus size={15} />
            Create key
          </Button>
        </div>
        {keys.length === 0 ? (
          <div className="state">
            <span className="state__icon">
              <KeyRound />
            </span>
            <h3>No API keys yet</h3>
            <p className="muted">Create one to authenticate requests against the RAG Starter API.</p>
          </div>
        ) : (
          <div className="list">
            {keys.map((k) => (
              <div className="list__row" key={k.id}>
                <span className="list__icon">
                  <KeyRound />
                </span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="truncate">{k.label}</div>
                  <div className="list__meta mono">{maskKey(k.key)}</div>
                </div>
                <button className="iconbtn" aria-label="Revoke" onClick={() => revokeKey(k.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="panel-head">
            <h3>API Documentation</h3>
          </div>
          <p className="muted">
            Endpoint reference, request/response shapes and error codes for the .NET API layer.
          </p>
          <Link className="btn btn--secondary" to="/docs#backend-connection">
            <BookOpen size={15} />
            Read the docs
          </Link>
        </section>

        <section className="card">
          <div className="panel-head">
            <h3>Usage</h3>
          </div>
          <dl className="kv">
            <dt>Questions this month</dt>
            <dd>{formatNumber(questionsThisMonth)}</dd>
            <dt>Detailed usage</dt>
            <dd>
              <Link to="/analytics">View Analytics →</Link>
            </dd>
          </dl>
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="panel-head">
            <h3>Webhooks</h3>
            <span className="pill">Coming Soon</span>
          </div>
          <p className="muted">
            <Webhook size={15} style={{ verticalAlign: '-3px', marginRight: 6 }} />
            Event webhooks (document processed, question asked) are not implemented on the
            backend yet.
          </p>
        </section>

        <section className="card">
          <div className="panel-head">
            <h3>SDK</h3>
            <span className="pill">Coming Soon</span>
          </div>
          <p className="muted">
            <PackageOpen size={15} style={{ verticalAlign: '-3px', marginRight: 6 }} />
            An official client SDK isn't published yet — use the REST API directly in the
            meantime.
          </p>
        </section>
      </div>

      <section className="card">
        <div className="panel-head">
          <h3>Self-hosting</h3>
        </div>
        <p className="muted">
          Want to run RAG Starter yourself instead of using the hosted product? Clone the
          repository and follow the setup guide.
        </p>
        <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
          <a
            className="btn btn--secondary"
            href="https://github.com/shamiulriyad/rag-kit"
            target="_blank"
            rel="noreferrer noopener"
          >
            <GithubIcon size={15} />
            View on GitHub
          </a>
          <Link className="btn btn--ghost" to="/developers">
            Self-hosting guide
          </Link>
        </div>
      </section>
    </div>
  )
}
