import { useState } from 'react'
import { Play, RotateCcw, Save, Variable, Info } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Field, Input, Textarea } from '../components/ui/Field'
import { Markdown } from '../lib/markdown'
import { useToast } from '../components/ui/Toast'
import { useLocalStorage } from '../lib/hooks'
import { useActivity } from '../lib/activity'
import { sampleAnswer } from '../lib/mockData'

const DEFAULT_PROMPT = `You are RAG Starter, a precise assistant that answers strictly from the provided context.

Rules:
- Use only the information in {context}.
- If the answer is not present, say "I couldn't find that in the indexed documents."
- Cite the document and page for every claim.
- Keep the answer concise and well structured.

Context:
{context}

Question:
{question}`

const VARIABLES = [
  { token: '{context}', desc: 'Retrieved chunks, concatenated' },
  { token: '{question}', desc: "The user's question" },
]

export default function PromptPlaygroundPage() {
  const toast = useToast()
  const { log } = useActivity()
  const [prompt, setPrompt] = useLocalStorage('rag-starter.system-prompt', DEFAULT_PROMPT)
  const [draft, setDraft] = useState(prompt)
  const [question, setQuestion] = useState(
    'When do we use the present perfect versus the past simple?',
  )
  const [answer, setAnswer] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  const dirty = draft !== prompt
  const missingVars = VARIABLES.filter((v) => !draft.includes(v.token))

  async function test() {
    setRunning(true)
    setAnswer(null)
    await new Promise((r) => setTimeout(r, 700))
    setAnswer(
      `${sampleAnswer}\n\n---\n\n_Mock preview. The prompt above (${draft.length} chars) will be sent to the RAG engine with \`{context}\` and \`{question}\` filled in._`,
    )
    setRunning(false)
  }

  function save() {
    setPrompt(draft)
    toast('ok', 'System prompt saved to this browser.')
    log('prompt', 'Updated the system prompt in Prompt Playground')
  }

  function reset() {
    setDraft(DEFAULT_PROMPT)
    toast('ok', 'Prompt reset to the default template.')
  }

  function insertVar(token: string) {
    setDraft((d) => `${d}${d.endsWith('\n') || d === '' ? '' : ' '}${token}`)
  }

  return (
    <div className="page">
      <div className="secret-note">
        <Info />
        <span>
          This configuration will be connected to the RAG engine later. For now
          the preview returns a mock answer so you can shape the prompt.
        </span>
      </div>

      <div className="pp">
        {/* Editor */}
        <section className="card pp__editor">
          <div className="panel-head">
            <h3>Prompt Editor</h3>
            {dirty && <span className="badge badge--primary">Unsaved</span>}
          </div>

          <div className="pp__vars">
            <span className="pp__vars-label">
              <Variable size={13} /> Variables
            </span>
            {VARIABLES.map((v) => (
              <button
                key={v.token}
                className="pp__var"
                title={v.desc}
                onClick={() => insertVar(v.token)}
              >
                {v.token}
              </button>
            ))}
          </div>

          <Textarea
            className="textarea pp__textarea mono"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
          />

          {missingVars.length > 0 && (
            <p className="field__hint" style={{ color: 'var(--warning)' }}>
              Missing {missingVars.map((v) => v.token).join(', ')} — the engine
              needs these to inject retrieval results.
            </p>
          )}

          <div className="pp__actions">
            <Button onClick={save} disabled={!dirty}>
              <Save size={15} />
              Save prompt
            </Button>
            <Button variant="secondary" onClick={reset}>
              <RotateCcw size={15} />
              Reset prompt
            </Button>
          </div>
        </section>

        {/* Preview */}
        <section className="card pp__preview">
          <div className="panel-head">
            <h3>Preview / Test Result</h3>
          </div>

          <Field label="Test question">
            {(id) => (
              <Input
                id={id}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            )}
          </Field>

          <Button onClick={test} loading={running}>
            <Play size={15} />
            Run test
          </Button>

          {!answer && !running && (
            <div className="state" style={{ margin: 'var(--sp-5) auto' }}>
              <span className="state__icon">
                <Play />
              </span>
              <h3>No result yet</h3>
              <p className="muted">
                Run a test to see how this prompt shapes the answer.
              </p>
            </div>
          )}

          {running && (
            <p className="muted" style={{ fontSize: '0.86rem' }}>
              Generating mock answer…
            </p>
          )}

          {answer && (
            <div className="pp__result">
              <Markdown content={answer} />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
