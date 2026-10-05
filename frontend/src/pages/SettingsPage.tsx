import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound, Save, RotateCcw, Check, Moon, Sun, Monitor, ShieldCheck, LogOut, Info } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Field, Input, Select } from '../components/ui/Field'
import { useToast } from '../components/ui/Toast'
import { useCheckout } from '../components/app/Checkout'
import { PLANS, usePlan } from '../lib/plan'
import { useTheme, type ThemePref } from '../lib/theme'
import { useAuth } from '../lib/auth'
import { useWorkspace } from '../lib/workspace'
import { initials } from '../lib/format'
import { changePassword, getSettings, updateSettings, type RagSettingsPatch } from '../services/api'

/** What the backend uses when a customer has never changed anything (UserSettings defaults). */
const RAG_DEFAULTS = { chunkSize: 1000, chunkOverlap: 150, topK: 4, similarityThreshold: 0 }
type RagForm = typeof RAG_DEFAULTS

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

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)

export default function SettingsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { plan, changePlan, isFree } = usePlan()
  const checkout = useCheckout()
  const { pref, setPref } = useTheme()
  const { user, signOut, adoptSession } = useAuth()
  const { workspaces, currentWorkspace, switchWorkspace, renameWorkspace } = useWorkspace()
  const [wsName, setWsName] = useState<string | null>(null)
  const [wsError, setWsError] = useState<string | null>(null)

  // RAG settings live on the server (per account), not in the browser.
  const [rag, setRag] = useState<RagForm>(RAG_DEFAULTS)
  const [ragLoad, setRagLoad] = useState<'loading' | 'ready' | 'error'>('loading')
  const [ragError, setRagError] = useState<string | null>(null)
  const [ragSaving, setRagSaving] = useState(false)

  // Password change
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwBusy, setPwBusy] = useState(false)

  const tabParam = params.get('tab')
  const [active, setActive] = useState(
    SECTIONS.some((s) => s.id === tabParam) ? (tabParam as string) : 'profile',
  )

  useEffect(() => {
    let cancelled = false
    getSettings()
      .then((s) => {
        if (cancelled) return
        setRag({
          chunkSize: s.chunkSize,
          chunkOverlap: s.chunkOverlap,
          topK: s.topK,
          similarityThreshold: s.similarityThreshold,
        })
        setRagLoad('ready')
      })
      .catch((e) => {
        if (cancelled) return
        setRagError(errText(e, 'Could not load your settings.'))
        setRagLoad('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  function selectTab(id: string) {
    setActive(id)
    setParams(id === 'profile' ? {} : { tab: id }, { replace: true })
  }

  function setField<K extends keyof RagForm>(key: K, value: RagForm[K]) {
    setRag((c) => {
      const next = { ...c, [key]: value }
      // The server rejects overlap >= size, so keep the sliders consistent instead.
      if (next.chunkOverlap >= next.chunkSize) next.chunkOverlap = Math.max(0, next.chunkSize - 50)
      return next
    })
  }

  async function saveRag() {
    setRagSaving(true)
    try {
      const patch: RagSettingsPatch = { ...rag }
      const saved = await updateSettings(patch)
      setRag({
        chunkSize: saved.chunkSize,
        chunkOverlap: saved.chunkOverlap,
        topK: saved.topK,
        similarityThreshold: saved.similarityThreshold,
      })
      toast('ok', 'Saved. Retrieval changes apply to your next question; chunking applies to documents processed from now on.')
    } catch (e) {
      toast('err', errText(e, 'Could not save your settings.'))
    } finally {
      setRagSaving(false)
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault()
    setPwError(null)
    if (newPw.length < 8) return setPwError('New password must be at least 8 characters.')
    if (newPw !== newPw2) return setPwError('The two new passwords do not match.')
    setPwBusy(true)
    try {
      // Every other session is ended server-side; this device gets a fresh session and stays in.
      adoptSession(await changePassword(curPw, newPw))
      setCurPw('')
      setNewPw('')
      setNewPw2('')
      toast('ok', 'Password updated. Your other devices were signed out.')
    } catch (err) {
      setPwError(errText(err, 'Could not change the password.'))
    } finally {
      setPwBusy(false)
    }
  }

  const ragLocked = isFree

  return (
    <div className="page">
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
                    {initials(user?.fullName ?? 'U')}
                  </span>
                  <div>
                    <strong>{user?.fullName}</strong>
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
              {workspaces.length === 0 ? (
                <p className="muted">
                  You have no workspaces yet. Team workspaces are part of the Team plan; create one from the
                  workspace menu in the sidebar.
                </p>
              ) : (
                <>
                  <Field label="Current workspace" full hint="Choose which of your workspaces you are working in.">
                    {(id) => (
                      <Select id={id} value={currentWorkspace?.id} onChange={(e) => switchWorkspace(e.target.value)}>
                        {workspaces.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                  <Field label="Workspace name" full error={wsError ?? undefined}>
                    {(id) => (
                      <Input
                        id={id}
                        value={wsName ?? currentWorkspace?.name ?? ''}
                        maxLength={100}
                        onChange={(e) => setWsName(e.target.value)}
                      />
                    )}
                  </Field>
                  <div>
                    <Button
                      disabled={!currentWorkspace || !wsName?.trim() || wsName.trim() === currentWorkspace.name}
                      onClick={async () => {
                        setWsError(null)
                        try {
                          await renameWorkspace(currentWorkspace!.id, wsName!.trim())
                          setWsName(null)
                          toast('ok', 'Workspace renamed.')
                        } catch (e) {
                          setWsError(errText(e, 'Could not rename the workspace.'))
                        }
                      }}
                    >
                      Save name
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {active === 'models' && (
            <div className="card settings-section">
              <h3>AI models</h3>
              <div className="secret-note">
                <Info />
                <span>
                  The language model and the embedding model are chosen once for the whole server, by
                  whoever runs it. They are not per-account settings, so there is nothing to change here.
                </span>
              </div>
              <dl className="kv">
                <dt>Answer model</dt>
                <dd className="mono">LLM_MODEL (server .env)</dd>
                <dt>Embedding model</dt>
                <dd className="mono">EMBEDDING_PROVIDER / EMBEDDING_MODEL (server .env)</dd>
              </dl>
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                Changing the embedding model on a server that already holds documents means every document
                has to be re-indexed (use <strong>Reprocess</strong> on each one), because vectors from
                different models cannot be compared.
              </p>
            </div>
          )}

          {active === 'storage' && (
            <div className="card settings-section">
              <h3>Storage &amp; vector database</h3>
              <div className="secret-note">
                <Info />
                <span>
                  Storage locations are configured by whoever runs the server, so they are shown here as
                  information only.
                </span>
              </div>
              <dl className="kv">
                <dt>Uploaded PDFs</dt>
                <dd>Supabase Storage when configured, otherwise the server's local disk</dd>
                <dt>Embeddings</dt>
                <dd>Qdrant, one collection per Knowledge Base</dd>
                <dt>Application data</dt>
                <dd>Postgres (accounts, Knowledge Bases, chats, usage)</dd>
              </dl>
            </div>
          )}

          {active === 'rag' && (
            <div className="card settings-section">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0 }}>RAG Configuration</h3>
                <span className="pill">Advanced</span>
              </div>
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                These control how your documents are chunked and retrieved. They are saved to your account
                and used by the server. Most customers never need to touch them — the defaults work well for
                typical PDFs.
              </p>

              {ragLocked && (
                <div className="secret-note">
                  <Info />
                  <span>
                    Changing these needs the Pro or Team plan.{' '}
                    <Link to="/billing">See plans</Link>. The values below are what your account uses now.
                  </span>
                </div>
              )}
              {ragLoad === 'error' && (
                <div className="state state--error">
                  <h3>Couldn't load your settings</h3>
                  <p className="muted">{ragError}</p>
                </div>
              )}

              {ragLoad !== 'error' && (
                <fieldset
                  disabled={ragLocked || ragLoad === 'loading'}
                  style={{ border: 0, padding: 0, margin: 0, display: 'contents' }}
                >
                  <Field
                    label="Chunk size"
                    hint="Characters per chunk. Applies to documents processed after you save — Reprocess existing ones to re-chunk them."
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
                          value={rag.chunkSize}
                          onChange={(e) => setField('chunkSize', Number(e.target.value))}
                        />
                        <output>{rag.chunkSize}</output>
                      </div>
                    )}
                  </Field>
                  <Field label="Chunk overlap" hint="Characters shared between adjacent chunks. Always smaller than the chunk size.">
                    {(id) => (
                      <div className="slider-row">
                        <input
                          id={id}
                          className="slider"
                          type="range"
                          min={0}
                          max={400}
                          step={10}
                          value={rag.chunkOverlap}
                          onChange={(e) => setField('chunkOverlap', Number(e.target.value))}
                        />
                        <output>{rag.chunkOverlap}</output>
                      </div>
                    )}
                  </Field>
                  <Field label="Top-K retrieval" hint="How many chunks are retrieved and handed to the model for each question.">
                    {(id) => (
                      <div className="slider-row">
                        <input
                          id={id}
                          className="slider"
                          type="range"
                          min={1}
                          max={12}
                          step={1}
                          value={rag.topK}
                          onChange={(e) => setField('topK', Number(e.target.value))}
                        />
                        <output>{rag.topK}</output>
                      </div>
                    )}
                  </Field>
                  <Field
                    label="Minimum similarity"
                    hint="Chunks scoring below this are ignored. 0 keeps every retrieved chunk; raise it to cut weak matches."
                  >
                    {(id) => (
                      <div className="slider-row">
                        <input
                          id={id}
                          className="slider"
                          type="range"
                          min={0}
                          max={0.9}
                          step={0.05}
                          value={rag.similarityThreshold}
                          onChange={(e) => setField('similarityThreshold', Number(e.target.value))}
                        />
                        <output>{rag.similarityThreshold.toFixed(2)}</output>
                      </div>
                    )}
                  </Field>
                </fieldset>
              )}
            </div>
          )}

          {active === 'security' && (
            <>
              <div className="card settings-section">
                <h3>Change password</h3>
                <form onSubmit={onChangePassword} className="stack" style={{ gap: 'var(--sp-4)' }}>
                  <Field label="Current password">
                    {(id) => (
                      <Input
                        id={id}
                        type="password"
                        autoComplete="current-password"
                        value={curPw}
                        onChange={(e) => setCurPw(e.target.value)}
                        required
                        maxLength={128}
                      />
                    )}
                  </Field>
                  <Field label="New password" hint="At least 8 characters. Common passwords are refused.">
                    {(id) => (
                      <Input
                        id={id}
                        type="password"
                        autoComplete="new-password"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        required
                        minLength={8}
                        maxLength={128}
                      />
                    )}
                  </Field>
                  <Field label="Confirm new password" error={pwError ?? undefined}>
                    {(id) => (
                      <Input
                        id={id}
                        type="password"
                        autoComplete="new-password"
                        value={newPw2}
                        onChange={(e) => setNewPw2(e.target.value)}
                        required
                        maxLength={128}
                      />
                    )}
                  </Field>
                  <div>
                    <Button type="submit" loading={pwBusy}>
                      <KeyRound size={15} />
                      Update password
                    </Button>
                  </div>
                  <span className="field__hint">
                    Changing your password signs you out of every other device.
                  </span>
                </form>
              </div>

              <div className="card settings-section">
                <h3>Account security</h3>
                <dl className="kv">
                  <dt>Signed in as</dt>
                  <dd>{user?.email}</dd>
                  <dt>Email address</dt>
                  <dd>{user?.emailVerified ? 'Verified' : 'Not verified yet'}</dd>
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
            </>
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
                  No payment provider is connected yet. The checkout is a demo: it can change your plan
                  limits (when the server allows it) but never charges anything and there are no invoices.
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
                        onClick={async () => {
                          if (id === 'free') {
                            try {
                              await changePlan(id)
                              toast('ok', 'Switched to the Free plan.')
                            } catch (e) {
                              toast('err', errText(e, 'Could not change your plan.'))
                            }
                            return
                          }
                          checkout.open(id, async () => {
                            await changePlan(id)
                            toast('ok', `Switched to ${p.name}.`)
                          })
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
                Create, copy and revoke your personal API keys on the{' '}
                <Link to="/developer">Developer Portal</Link>. Use them to call RAG Starter from your own code.
              </p>
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                Server secrets — the Gemini key, the Qdrant key, the shared RAG service key — are
                intentionally not shown or editable from the app. They live in the server's environment.
              </p>
              <Button variant="secondary" onClick={() => navigate('/developer')}>
                Open the Developer Portal
              </Button>
            </div>
          )}

          {active === 'rag' && ragLoad !== 'error' && (
            <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
              <Button onClick={saveRag} loading={ragSaving} disabled={ragLocked || ragLoad === 'loading'}>
                <Save size={15} />
                Save settings
              </Button>
              <Button
                variant="secondary"
                disabled={ragLocked || ragLoad === 'loading'}
                onClick={() => {
                  setRag(RAG_DEFAULTS)
                  toast('ok', 'Defaults loaded - press Save to apply them.')
                }}
              >
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
