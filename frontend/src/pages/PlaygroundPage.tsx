import { Fragment, useState } from 'react'
import {
  Play,
  RotateCcw,
  MessageSquare,
  Database,
  FileStack,
  Sparkles,
  Quote,
  ArrowRight,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { Markdown } from '../lib/markdown'
import { useActivity } from '../lib/activity'
import { mockSources } from '../lib/appData'
import { sampleAnswer } from '../lib/mockData'

interface Params {
  chunkSize: number
  chunkOverlap: number
  topK: number
  threshold: number
  temperature: number
}

const DEFAULTS: Params = {
  chunkSize: 800,
  chunkOverlap: 120,
  topK: 4,
  threshold: 0.7,
  temperature: 0.2,
}

const STAGES = [
  { key: 'question', label: 'Question', icon: MessageSquare },
  { key: 'retrieval', label: 'Retrieval', icon: Database },
  { key: 'context', label: 'Context', icon: FileStack },
  { key: 'llm', label: 'LLM', icon: Sparkles },
  { key: 'answer', label: 'Answer', icon: Quote },
] as const

interface RunResult {
  chunks: { document: string; page: number; snippet: string; score: number }[]
  context: string
  answer: string
}

export default function PlaygroundPage() {
  const { log } = useActivity()
  const [params, setParams] = useState<Params>(DEFAULTS)
  const [question, setQuestion] = useState(
    'When do we use the present perfect versus the past simple?',
  )
  const [stage, setStage] = useState(-1)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)

  function set<K extends keyof Params>(k: K, v: number) {
    setParams((p) => ({ ...p, [k]: v }))
  }

  async function run() {
    if (running || !question.trim()) return
    setRunning(true)
    setResult(null)
    for (let i = 0; i < STAGES.length; i++) {
      setStage(i)
      await new Promise((r) => setTimeout(r, 420))
    }
    // Mock retrieval: score sources, apply threshold + top-K.
    const scored = mockSources
      .map((s, i) => ({
        document: s.document,
        page: s.page,
        snippet: s.snippet,
        score: Math.max(0.42, 0.94 - i * 0.11 - (params.temperature - 0.2) * 0.1),
      }))
      .filter((c) => c.score >= params.threshold)
      .slice(0, params.topK)

    const chunks = scored.length ? scored : mockSources.slice(0, 1).map((s) => ({
      document: s.document,
      page: s.page,
      snippet: s.snippet,
      score: 0.51,
    }))

    setResult({
      chunks,
      context: chunks
        .map((c, i) => `[${i + 1}] ${c.document} p.${c.page}\n${c.snippet}`)
        .join('\n\n'),
      answer: sampleAnswer,
    })
    setRunning(false)
    log('settings', `Ran a Playground test (top-K ${params.topK}, temp ${params.temperature})`)
  }

  function reset() {
    setParams(DEFAULTS)
    setResult(null)
    setStage(-1)
  }

  const sliders: {
    key: keyof Params
    label: string
    min: number
    max: number
    step: number
    fmt?: (n: number) => string
  }[] = [
    { key: 'chunkSize', label: 'Chunk Size', min: 200, max: 2000, step: 50 },
    { key: 'chunkOverlap', label: 'Chunk Overlap', min: 0, max: 400, step: 10 },
    { key: 'topK', label: 'Top-K', min: 1, max: 12, step: 1 },
    {
      key: 'threshold',
      label: 'Similarity Threshold',
      min: 0,
      max: 1,
      step: 0.05,
      fmt: (n) => n.toFixed(2),
    },
    {
      key: 'temperature',
      label: 'Temperature',
      min: 0,
      max: 1,
      step: 0.05,
      fmt: (n) => n.toFixed(2),
    },
  ]

  return (
    <div className="page">
      <div className="secret-note">
        <Sparkles />
        <span>
          A visual sandbox for retrieval parameters. Responses are mocked — these
          controls map 1:1 to the real pipeline settings and will drive it once
          the backend is connected.
        </span>
      </div>

      <div className="pg">
        <aside className="card pg__controls">
          <h3>Parameters</h3>
          {sliders.map((s) => (
            <Field
              key={s.key}
              label={s.label}
              hint={`${s.min} – ${s.max}`}
            >
              {(id) => (
                <div className="slider-row">
                  <input
                    id={id}
                    className="slider"
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={params[s.key]}
                    onChange={(e) => set(s.key, Number(e.target.value))}
                  />
                  <output>
                    {s.fmt ? s.fmt(params[s.key]) : params[s.key]}
                  </output>
                </div>
              )}
            </Field>
          ))}
          <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
            <Button variant="secondary" onClick={reset} disabled={running}>
              <RotateCcw size={15} />
              Reset
            </Button>
          </div>
        </aside>

        <div className="pg__main">
          <div className="card">
            <Field label="Test question">
              {(id) => (
                <Input
                  id={id}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask something the knowledge base should answer…"
                />
              )}
            </Field>
            <div className="pg__pipeline">
              {STAGES.map((s, i) => (
                <Fragment key={s.key}>
                  <div
                    className={`pg__stage${
                      running && stage === i ? ' is-active' : ''
                    }${!running && result && i <= STAGES.length - 1 ? ' is-done' : ''}`}
                  >
                    <span className="pg__stage-icon">
                      <s.icon size={16} />
                    </span>
                    {s.label}
                  </div>
                  {i < STAGES.length - 1 && (
                    <ArrowRight size={15} className="pg__pipe-arrow" />
                  )}
                </Fragment>
              ))}
            </div>
            <Button onClick={run} loading={running} disabled={!question.trim()}>
              <Play size={15} />
              Run Test
            </Button>
          </div>

          {!result && !running && (
            <div className="state">
              <span className="state__icon">
                <Play />
              </span>
              <h3>Run a test to see the pipeline</h3>
              <p className="muted">
                Adjust the parameters, enter a question, then hit Run Test to see
                retrieved chunks, the assembled context and a generated answer.
              </p>
            </div>
          )}

          {result && (
            <>
              <section className="card">
                <div className="panel-head">
                  <h3>Retrieved chunks</h3>
                  <span className="muted" style={{ fontSize: '0.8rem' }}>
                    {result.chunks.length} of top-{params.topK} · threshold{' '}
                    {params.threshold.toFixed(2)}
                  </span>
                </div>
                <div className="list">
                  {result.chunks.map((c, i) => (
                    <div className="list__row" key={i} style={{ alignItems: 'flex-start' }}>
                      <span className="list__icon">
                        <Quote />
                      </span>
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div style={{ color: 'var(--text)', fontSize: '0.84rem' }}>
                          {c.document} · p.{c.page}
                        </div>
                        <div className="list__meta">{c.snippet}</div>
                        <div className="score-bar" style={{ marginTop: 6 }}>
                          <i style={{ width: `${Math.round(c.score * 100)}%` }} />
                        </div>
                      </div>
                      <span className="mono" style={{ fontSize: '0.8rem' }}>
                        {c.score.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="card">
                <div className="panel-head">
                  <h3>Context preview</h3>
                </div>
                <pre className="pg__context scroll">{result.context}</pre>
              </section>

              <section className="card">
                <div className="panel-head">
                  <h3>Generated answer</h3>
                  <span className="muted" style={{ fontSize: '0.8rem' }}>
                    temp {params.temperature.toFixed(2)}
                  </span>
                </div>
                <Markdown content={result.answer} />
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
