import { useState } from 'react'
import { KeyRound, Save, RotateCcw } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Field, Input, Select } from '../components/ui/Field'
import { useToast } from '../components/ui/Toast'

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
  { id: 'providers', label: 'Providers & Models' },
  { id: 'vector', label: 'Qdrant & Collection' },
  { id: 'retrieval', label: 'Chunking & Retrieval' },
  { id: 'secrets', label: 'Secrets' },
]

export default function SettingsPage() {
  const toast = useToast()
  const [cfg, setCfg] = useState<Config>(load)
  const [active, setActive] = useState('providers')

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
              onClick={() => setActive(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="settings-section">
          {active === 'providers' && (
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

          {active === 'vector' && (
            <div className="card settings-section">
              <h3>Qdrant &amp; collection</h3>
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

          {active === 'retrieval' && (
            <div className="card settings-section">
              <h3>Chunking &amp; retrieval</h3>
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

          {active === 'secrets' && (
            <div className="card settings-section">
              <h3>Secrets</h3>
              <p className="muted">
                Secrets are intentionally not editable from the UI. Set them in
                the backend environment and restart the affected service.
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
            </div>
          )}

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
        </div>
      </div>
    </div>
  )
}
