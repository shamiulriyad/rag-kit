export const CUSTOMER_STEPS = [
  { n: '01', title: 'Upload', body: 'Add your PDFs to a knowledge base — no setup required.' },
  { n: '02', title: 'Process', body: 'Your documents are extracted, chunked and indexed automatically.' },
  { n: '03', title: 'Ask', body: 'Ask questions in plain language, in Knowledge Chat.' },
  { n: '04', title: 'Answer', body: 'Get an answer grounded in your documents, with sources.' },
]

export const DEVELOPER_STEPS = [
  { n: '01', title: 'Clone', body: 'Pull the open-source repository from GitHub.' },
  { n: '02', title: 'Configure', body: 'Set your LLM key, embedding model and Qdrant URL in .env.' },
  { n: '03', title: 'Run', body: 'docker compose up brings the whole stack online.' },
  { n: '04', title: 'Customize', body: 'Change chunking, retrieval, prompts — it is your codebase.' },
  { n: '05', title: 'Deploy', body: 'Ship it on your own infrastructure, under your own control.' },
]

function StepList({ steps }: { steps: { n: string; title: string; body: string }[] }) {
  return (
    <div className="steps">
      {steps.map((s) => (
        <div className="step" key={s.n}>
          <span className="step__num">{s.n}</span>
          <h3>{s.title}</h3>
          <p>{s.body}</p>
        </div>
      ))}
    </div>
  )
}

/** Customer vs developer workflows, kept visually separate per product positioning. */
export default function HowItWorksTracks() {
  return (
    <div className="tracks">
      <div className="tracks__col">
        <div className="tracks__head">
          <span className="pill pill--ok">For Customers</span>
          <p className="muted">Upload → Process → Ask → Answer</p>
        </div>
        <StepList steps={CUSTOMER_STEPS} />
      </div>
      <div className="tracks__divider" aria-hidden />
      <div className="tracks__col">
        <div className="tracks__head">
          <span className="pill">For Developers</span>
          <p className="muted">Clone → Configure → Run → Customize → Deploy</p>
        </div>
        <StepList steps={DEVELOPER_STEPS} />
      </div>
    </div>
  )
}
