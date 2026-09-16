import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound, Save, RotateCcw, Check, Moon, Sun, Monitor, ShieldCheck, LogOut } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Field, Input, Select } from '../components/ui/Field'
import { useToast } from '../components/ui/Toast'
import { PLANS, usePlan } from '../lib/plan'
import { useTheme, type ThemePref } from '../lib/theme'
import { useAuth } from '../lib/auth'
import { useWorkspace } from '../lib/workspace'
import { initials } from '../lib/format'

interface Config {
  llmProvider: string
  geminiModel: string
  embeddingProvider: string
  embeddingModel: string
  qdrantUrl: string
  collection: string
  chunkSize: number
  chunkOverlap: number
  topK: number
}

const DEFAULTS: Config = {
  llmProvider: 'gemini',
  geminiModel: 'gemini-1.5-pro',
  embeddingProvider: 'huggingface',
  embeddingModel: 'BAAI/bge-m3',
  qdrantUrl: 'http://qdrant:6333',
  collection: 'rag_documents',
  chunkSize: 800,
  chunkOverlap: 120,
  topK: 5,
}

const STORAGE_KEY = 'rag-starter.settings'

function load(): Config {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'rag', label: 'RAG Configuration' },
  { id: 'models', label: 'AI Models' },
  { id: 'storage', label: 'Storage' },
  { id: 'security', label: 'Security' },
  { id: 'keys', label: 'API Keys' },
  { id: 'billing', label: 'Billing' },
]

const THEME_OPTIONS: { id: ThemePref; label: string; icon: typeof Moon }[] = [
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'system', label: 'System', icon: Monitor },
]

export default function SettingsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { plan, changePlan } = usePlan()
  const { pref, setPref } = useTheme()
  const { user, signOut } = useAuth()
  const { workspaces, currentWorkspace, switchWorkspace, renameWorkspace } = useWorkspace()
  const [cfg, setCfg] = useState<Config>(load)
  const tabParam = params.get('tab')
  const [active, setActive] = useState(
    SECTIONS.some((s) => s.id === tabParam) ? (tabParam as string) : 'profile',
  )

  function selectTab(id: string) {
    setActive(id)
    setParams(id === 'profile' ? {} : { tab: id }, { replace: true })
  }

  function set<K extends keyof Config>(key: K, value: Config[K]) {
    setCfg((c) => ({ ...c, [key]: value }))
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
      toast('ok', 'UI configuration saved to this browser.')
    } catch {
      toast('err', 'Could not write to localStorage.')
    }
  }

  function reset() {
    setCfg(DEFAULTS)
    toast('ok', 'Reverted to default configuration.')
  }

  return (
    <div className="page">
      <div className="secret-note">
        <KeyRound />
        <span>
          These panels edit <strong>UI preferences only</strong>, stored in your
          browser. The values the running system actually uses — API keys, the
          real Qdrant URL, model names — come from the backend <code>.env</code>{' '}
          and are never entered or displayed here.
        </span>
      </div>

      <div className="settings-grid">
        <nav className="settings-nav">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              aria-current={active === s.id}
              onClick={() => selectTab(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="settings-section">
          {active === 'profile' && (
            <>
              <div className="card settings-section">
                <h3>Profile</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                  <span className="avatar" style={{ width: 44, height: 44, fontSize: '0.95rem' }}>
                    {initials(user?.name ?? 'U')}
                  </span>
                  <div>
                    <strong>{user?.name}</strong>
                    <div className="muted" style={{ fontSize: '0.85rem' }}>
                      {user?.email}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" onClick={signOut} style={{ marginTop: 'var(--sp-4)' }}>
                  <LogOut size={15} />
                  Sign out
                </Button>
              </div>

              <div className="card settings-section">
                <h3>Appearance</h3>
                <Field
                  label="Theme"
                  hint="Applies instantly and is remembered on this device."
                >
                  {() => (
                    <div className="segmented" role="tablist" aria-label="Theme">
                      {THEME_OPTIONS.map((o) => (
                        <button
                          key={o.id}
                          role="tab"
                          aria-selected={pref === o.id}
                          className={pref === o.id ? 'is-active' : ''}
                          onClick={() => setPref(o.id)}
                        >
                          <o.icon size={15} />
                          {o.label}
                        </button>
                      ))}
                    </div>
                  )}
                </Field>
              </div>
            </>
          )}

          {active === 'workspace' && (
            <div className="card settings-section">
              <h3>Workspace</h3>
              <Field label="Current workspace" full hint="The selected workspace controls what data you see across the app.">
                {(id) => (
                  <Select
                    id={id}
                    value={currentWorkspace?.id}
                    onChange={(e) => switchWorkspace(e.target.value)}
                  >
                    {workspaces.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Workspace name" full>
                {(id) => (
                  <Input
                    id={id}
                    value={currentWorkspace?.name ?? ''}
                    onChange={(e) =>
                      currentWorkspace && renameWorkspace(currentWorkspace.id, e.target.value)
                    }
                  />
                )}
              </Field>
            </div>
          )}

          {active === 'models' && (
            <>
              <div className="card settings-section">
                <h3>LLM provider</h3>
                <div className="form-grid">
                  <Field label="Provider" hint="Set LLM_PROVIDER in backend .env">
                    {(id) => (
                      <Select
                        id={id}
                        value={cfg.llmProvider}
                        onChange={(e) => set('llmProvider', e.target.value)}
                      >
                        <option value="gemini">Google Gemini</option>
                        <option value="openai">OpenAI (compatible)</option>
                        <option value="local">Local / self-hosted</option>
                      </Select>
                    )}
                  </Field>
                  <Field label="Gemini model" hint="GEMINI_MODEL">
                    {(id) => (
                      <Select
                        id={id}
                        value={cfg.geminiModel}
                        onChange={(e) => set('geminiModel', e.target.value)}
                      >
                        <option>gemini-1.5-pro</option>
                        <option>gemini-1.5-flash</option>
                        <option>gemini-1.0-pro</option>
                      </Select>
                    )}
                  </Field>
                </div>
              </div>

              <div className="card settings-section">
                <h3>Embeddings</h3>
                <div className="form-grid">
                  <Field label="Embedding provider" hint="EMBEDDING_PROVIDER">
                    {(id) => (
                      <Select
                        id={id}
                        value={cfg.embeddingProvider}
                        onChange={(e) => set('embeddingProvider', e.target.value)}
                      >
                        <option value="huggingface">HuggingFace (local)</option>
                        <option value="gemini">Gemini embeddings</option>
                        <option value="openai">OpenAI embeddings</option>
                      </Select>
                    )}
                  </Field>
                  <Field
                    label="Embedding model"
                    hint="EMBEDDING_MODEL — keep multilingual for Bangla / mixed docs"
                  >
                    {(id) => (
                      <Input
                        id={id}
                        value={cfg.embeddingModel}
                        onChange={(e) => set('embeddingModel', e.target.value)}
                      />
                    )}
                  </Field>
                </div>
              </div>
            </>
          )}

          {active === 'storage' && (
            <div className="card settings-section">
              <h3>Storage &amp; vector database</h3>
              <div className="form-grid">
                <Field
                  label="Qdrant URL"
                  full
                  hint="QDRANT_URL — server mode. In Docker use the service name (http://qdrant:6333); for local dev use http://localhost:6333."
                >
                  {(id) => (
                    <Input
                      id={id}
                      className="input mono"
                      value={cfg.qdrantUrl}
                      onChange={(e) => set('qdrantUrl', e.target.value)}
                    />
                  )}
                </Field>
                <Field label="Collection name" hint="QDRANT_COLLECTION">
                  {(id) => (
                    <Input
                      id={id}
                      value={cfg.collection}
                      onChange={(e) => set('collection', e.target.value)}
                    />
                  )}
                </Field>
              </div>
            </div>
          )}

          {active === 'rag' && (
            <div className="card settings-section">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0 }}>RAG Configuration</h3>
                <span className="pill">Advanced</span>
              </div>
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                These control how documents are chunked and retrieved. Most customers never need
                to touch this — the defaults work well for typical PDFs.
              </p>
              <Field
                label="Chunk size"
                hint="Characters per chunk before embedding (CHUNK_SIZE)"
              >
                {(id) => (
                  <div className="slider-row">
                    <input
                      id={id}
                      className="slider"
                      type="range"
                      min={200}
                      max={2000}
                      step={50}
                      value={cfg.chunkSize}
                      onChange={(e) => set('chunkSize', Number(e.target.value))}
                    />
                    <output>{cfg.chunkSize}</output>
                  </div>
                )}
              </Field>
              <Field
                label="Chunk overlap"
                hint="Characters shared between adjacent chunks (CHUNK_OVERLAP)"
              >
                {(id) => (
                  <div className="slider-row">
                    <input
                      id={id}
                      className="slider"
                      type="range"
                      min={0}
                      max={400}
                      step={10}
                      value={cfg.chunkOverlap}
                      onChange={(e) => set('chunkOverlap', Number(e.target.value))}
                    />
                    <output>{cfg.chunkOverlap}</output>
                  </div>
                )}
              </Field>
              <Field
                label="Top-K retrieval"
                hint="How many chunks are retrieved and passed to Gemini (TOP_K)"
              >
                {(id) => (
                  <div className="slider-row">
                    <input
                      id={id}
                      className="slider"
                      type="range"
                      min={1}
                      max={12}
                      step={1}
                      value={cfg.topK}
                      onChange={(e) => set('topK', Number(e.target.value))}
                    />
                    <output>{cfg.topK}</output>
                  </div>
                )}
              </Field>
            </div>
          )}

          {active === 'security' && (
            <div className="card settings-section">
              <h3>Security</h3>
              <dl className="kv">
                <dt>Authentication</dt>
                <dd>Email &amp; password (demo — stored in this browser only)</dd>
                <dt>Signed in as</dt>
                <dd>{user?.email}</dd>
                <dt>Two-factor authentication</dt>
                <dd>
                  <span className="pill">Coming Soon</span>
                </dd>
              </dl>
              <Button variant="ghost" onClick={signOut}>
                <ShieldCheck size={15} />
                Sign out of this device
              </Button>
            </div>
          )}

          {active === 'billing' && (
            <div className="card settings-section">
              <h3>Plan &amp; Billing</h3>
              <div className="usage__head">
                <span className="usage__plan">
                  Current plan: <strong>{PLANS[plan].name}</strong>
                </span>
                <span className="pill pill--ok">
                  <span className="pill__dot" />
                  {PLANS[plan].name} · active
                </span>
              </div>

              <div className="secret-note">
                <KeyRound />
                <span>
                  Billing is not implemented yet. There is no Stripe integration,
                  no subscription backend and no invoices — switching plans here
                  only updates this browser so the product experience can be
                  explored. Real payments are planned for a future release.
                </span>
              </div>

              <div className="plan-picker">
                {(['free', 'pro', 'team'] as const).map((id) => {
                  const p = PLANS[id]
                  const current = plan === id
                  return (
                    <div
                      key={id}
                      className={`plan${id === 'pro' ? ' plan--pro' : ''}${
                        id === 'team' ? ' plan--team' : ''
                      }`}
                      style={{ padding: 'var(--sp-5)' }}
                    >
                      <span className="plan__name">{p.name}</span>
                      <div className="plan__price">
                        <span className="plan__amount" style={{ fontSize: '1.8rem' }}>
                          ${p.priceMonthly}
                        </span>
                        <span className="plan__period">/ month</span>
                      </div>
                      <ul className="plan__features" style={{ marginTop: 'var(--sp-3)' }}>
                        {p.features.slice(0, 4).map((f) => (
                          <li key={f}>
                            <Check size={15} />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant={current || id === 'free' ? 'secondary' : 'primary'}
                        block
                        disabled={current}
                        onClick={() => {
                          changePlan(id)
                          toast(
                            'ok',
                            id === 'free'
                              ? 'Switched to the Free plan (demo).'
                              : `Switched to ${p.name} (demo — no payment processed).`,
                          )
                        }}
                      >
                        {current ? 'Current plan' : `Switch to ${p.name}`}
                      </Button>
                    </div>
                  )
                })}
              </div>

              <Button variant="ghost" onClick={() => navigate('/pricing')}>
                View full pricing &amp; comparison
              </Button>
            </div>
          )}

          {active === 'keys' && (
            <div className="card settings-section">
              <h3>API Keys</h3>
              <p className="muted">
                Backend secrets are intentionally not editable from the UI — set them in the
                backend environment and restart the affected service.
              </p>
              <dl className="kv">
                <dt>GEMINI_API_KEY</dt>
                <dd className="mono">•••••••••••••••• &nbsp;(backend .env)</dd>
                <dt>QDRANT_API_KEY</dt>
                <dd className="mono">optional — set for Qdrant Cloud</dd>
                <dt>Upload__MaxBytes</dt>
                <dd className="mono">.NET request limit</dd>
                <dt>MAX_UPLOAD_MB</dt>
                <dd className="mono">Python request limit</dd>
              </dl>
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                To generate personal API keys for calling RAG Starter programmatically, use the{' '}
                <Button variant="ghost" onClick={() => navigate('/developer')}>
                  Developer Portal
                </Button>
                .
              </p>
            </div>
          )}

          {(active === 'models' || active === 'storage' || active === 'rag') && (
            <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
              <Button onClick={save}>
                <Save size={15} />
                Save preferences
              </Button>
              <Button variant="secondary" onClick={reset}>
                <RotateCcw size={15} />
                Reset to defaults
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
