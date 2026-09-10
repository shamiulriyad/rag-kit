import { useState } from 'react'
import { FileText, Play, RotateCcw, Check, Quote } from 'lucide-react'
import { LinkButton } from '../ui/Button'
import { Markdown } from '../../lib/markdown'

const STEPS = ['Extracting text', 'Cleaning', 'Chunking', 'Embedding', 'Indexing']

const QUESTION =
  'What is the difference between present perfect and past perfect?'

const ANSWER = `The **present perfect** ( \`have / has\` + past participle ) links a past action to *now* — the time is unspecified or still relevant: _"I have finished the report."_

The **past perfect** ( \`had\` + past participle ) describes an action completed **before another past moment**: _"I had finished the report before the meeting started."_

In short: present perfect connects the past to the present; past perfect connects one past event to an earlier one.`

const SOURCES = [
  { doc: 'English Grammar.pdf', page: 142, score: 0.93 },
  { doc: 'English Grammar.pdf', page: 156, score: 0.87 },
]

type Phase = 'idle' | 'processing' | 'answering' | 'done'

export default function LiveDemo() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [done, setDone] = useState(0)

  async function run() {
    setPhase('processing')
    setDone(0)
    for (let i = 1; i <= STEPS.length; i++) {
      await new Promise((r) => setTimeout(r, 460))
      setDone(i)
    }
    await new Promise((r) => setTimeout(r, 400))
    setPhase('answering')
    await new Promise((r) => setTimeout(r, 900))
    setPhase('done')
  }

  function reset() {
    setPhase('idle')
    setDone(0)
  }

  const showAnswer = phase === 'done'

  return (
    <div className="demo">
      <div className="demo__bar">
        <i />
        <i />
        <i />
        <span>app.ragstarter.dev — demo</span>
      </div>

      <div className="demo__body">
        <div className="demo__col">
          <div className="demo__block">
            <h4>1 · Upload</h4>
            <div className="demo__file">
              <FileText size={16} />
              English Grammar.pdf
            </div>
          </div>

          <div className="demo__block">
            <h4>2 · Processing</h4>
            <div className="demo__steps">
              {STEPS.map((s, i) => {
                const isDone = done > i
                return (
                  <div
                    key={s}
                    className={`demo__step${isDone ? ' is-done' : ''}`}
                  >
                    <span className="demo__check">
                      <Check size={12} />
                    </span>
                    {s}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="demo__block">
            <h4>3 · Ask</h4>
            <div className="demo__bubble demo__bubble--user">{QUESTION}</div>
          </div>
        </div>

        <div className="demo__col">
          <div className="demo__block">
            <h4>4 · AI Answer</h4>
            {showAnswer ? (
              <div className="demo__answer">
                <Markdown content={ANSWER} />
              </div>
            ) : (
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                {phase === 'answering'
                  ? 'Retrieving context and generating an answer…'
                  : 'Run the demo to see a grounded answer appear here.'}
              </p>
            )}
          </div>

          <div className="demo__block">
            <h4>5 · Sources</h4>
            {showAnswer ? (
              <div className="sources-grid">
                {SOURCES.map((s) => (
                  <div className="source-card" key={s.page}>
                    <div className="source-card__top">
                      <Quote />
                      <span className="truncate">{s.doc}</span>
                    </div>
                    <div className="source-card__meta">
                      <span>Page {s.page}</span>
                      <span>{Math.round(s.score * 100)}% match</span>
                    </div>
                    <div className="score-bar">
                      <i style={{ width: `${Math.round(s.score * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                Every answer cites the document and page it used.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="demo__foot">
        <span className="muted" style={{ fontSize: '0.82rem' }}>
          Fully mocked — no upload leaves your browser. The real flow works the
          same way.
        </span>
        <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
          {phase === 'done' ? (
            <button className="btn btn--secondary btn--sm" onClick={reset}>
              <RotateCcw size={14} />
              Replay
            </button>
          ) : (
            <button
              className="btn btn--primary btn--sm"
              onClick={run}
              disabled={phase === 'processing' || phase === 'answering'}
            >
              <Play size={14} />
              {phase === 'idle' ? 'Try the Demo' : 'Running…'}
            </button>
          )}
          <LinkButton variant="secondary" size="sm" to="/signup">
            Start Free
          </LinkButton>
        </div>
      </div>
    </div>
  )
}
