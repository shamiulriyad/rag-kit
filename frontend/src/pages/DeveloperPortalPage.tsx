import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Copy, KeyRound, Plus, Trash2, BookOpen, Webhook, PackageOpen, Terminal } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { useToast } from '../components/ui/Toast'
import { GithubIcon } from '../components/ui/icons'
import { createApiKey, getUsage, listApiKeys, revokeApiKey, type ApiKeyItem } from '../services/api'
import { formatNumber } from '../lib/format'
import { relativeTime } from '../lib/format'

export default function DeveloperPortalPage() {
  const toast = useToast()
  const [questionsThisMonth, setQuestionsThisMonth] = useState(0)
  const [keys, setKeys] = useState<ApiKeyItem[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  /** The just-created secret. Shown once; the server only keeps a hash. */
  const [fresh, setFresh] = useState<{ name: string; rawKey: string } | null>(null)

  const load = useCallback(() => {
    listApiKeys()
      .then((k) => {
        setKeys(k)
        setLoadError(null)
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Could not load API keys.'))
  }, [])

  useEffect(() => {
    getUsage()
      .then((u) => setQuestionsThisMonth(u.questionsThisMonth))
      .catch(() => {})
    load()
  }, [load])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    const label = name.trim()
    if (label.length < 2) {
      toast('err', 'Give the key a name of at least 2 characters.')
      return
    }
    setCreating(true)
    try {
      const created = await createApiKey(label)
      setFresh({ name: created.name, rawKey: created.rawKey })
      setName('')
      load()
    } catch (err) {
      toast('err', err instanceof Error ? err.message : 'Could not create the key.')
    } finally {
      setCreating(false)
    }
  }

  async function onRevoke(k: ApiKeyItem) {
    if (!window.confirm(`Revoke "${k.name}"? Anything using it will stop working immediately.`)) return
    try {
      await revokeApiKey(k.id)
      toast('ok', 'Key revoked.')
      load()
    } catch (err) {
      toast('err', err instanceof Error ? err.message : 'Could not revoke the key.')
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast('ok', 'Copied to the clipboard.')
    } catch {
      toast('err', 'Could not copy - select the key and copy it manually.')
    }
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
        </div>
        <p className="muted" style={{ fontSize: '0.86rem' }}>
          Send a key as <code>X-API-Key: &lt;key&gt;</code> or <code>Authorization: Bearer &lt;key&gt;</code>.
          A key acts as you (same plan limits and Knowledge Bases) but cannot manage keys, change
          your password or plan, or reach the admin API.
        </p>

        <form onSubmit={onCreate} style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px' }}>
            <Field label="New key name">
              {(id) => (
                <Input
                  id={id}
                  placeholder='e.g. "Local dev"'
                  value={name}
                  maxLength={100}
                  onChange={(e) => setName(e.target.value)}
                />
              )}
            </Field>
          </div>
          <Button type="submit" loading={creating}>
            <Plus size={15} />
            Create key
          </Button>
        </form>

        {fresh && (
          <div className="secret-note" style={{ flexDirection: 'column', gap: 'var(--sp-2)' }}>
            <strong>Copy "{fresh.name}" now - it won't be shown again.</strong>
            <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center', flexWrap: 'wrap' }}>
              <code className="mono" style={{ wordBreak: 'break-all' }}>{fresh.rawKey}</code>
              <Button type="button" variant="secondary" size="sm" onClick={() => copy(fresh.rawKey)}>
                <Copy size={14} />
                Copy
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setFresh(null)}>
                I've saved it
              </Button>
            </div>
          </div>
        )}

        {loadError ? (
          <div className="state">
            <h3>Couldn't load your keys</h3>
            <p className="muted">{loadError}</p>
            <Button variant="secondary" onClick={load}>Try again</Button>
          </div>
        ) : keys === null ? (
          <div className="state">
            <span className="spinner" />
          </div>
        ) : keys.length === 0 ? (
          <div className="state">
            <span className="state__icon">
              <KeyRound />
            </span>
            <h3>No API keys yet</h3>
            <p className="muted">Create one to call the RAG Starter API from your own code.</p>
          </div>
        ) : (
          <div className="list">
            {keys.map((k) => (
              <div className="list__row" key={k.id}>
                <span className="list__icon">
                  <KeyRound />
                </span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="truncate">{k.name}</div>
                  <div className="list__meta mono">{k.prefix}</div>
                  <div className="list__meta">
                    Created {relativeTime(k.createdAt)} ·{' '}
                    {k.lastUsedAt ? `last used ${relativeTime(k.lastUsedAt)}` : 'never used'}
                  </div>
                </div>
                <button className="iconbtn" aria-label={`Revoke ${k.name}`} onClick={() => onRevoke(k)}>
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
