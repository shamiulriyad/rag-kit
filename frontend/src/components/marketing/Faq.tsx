export interface FaqItem {
  q: string
  a: string
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'What is this product?',
    a: 'RAG Starter turns your documents into an AI knowledge workspace: upload PDFs, and ask questions that get answered with citations back to the source. It is also an open-source foundation developers can self-host and extend.',
  },
  {
    q: 'Who is it for?',
    a: 'Two audiences: customers (students, teams, businesses) who want to use AI over their documents without managing infrastructure, and developers who want a self-hosted RAG codebase to build on.',
  },
  {
    q: 'Do I need coding knowledge?',
    a: 'No. To use the hosted product, sign up, create a knowledge base, upload documents and ask questions — no embeddings, Qdrant, chunking, Python, Docker or API keys to understand. Those details are only relevant if you choose to self-host.',
  },
  {
    q: 'What documents can I upload?',
    a: 'Text-based PDFs work directly. Scanned or image-only PDFs need OCR first — the app tells you clearly when a document needs that instead of pretending to index it.',
  },
  {
    q: 'How does source citation work?',
    a: 'Every answer is generated from the specific chunks retrieved for your question, and each response shows which document and page it came from.',
  },
  {
    q: 'What is the difference between Hosted and Open Source?',
    a: 'The hosted SaaS is the managed product — sign up and go, no infrastructure. The GitHub repository is the open-source, self-hosted version of the same architecture. They are related but separate: the repo is not a copy of the hosted product.',
  },
  {
    q: 'Can developers self-host it?',
    a: 'Yes. Clone the repository, configure your .env (LLM key, embedding model, Qdrant URL) and run it with Docker Compose. The Developer Portal and documentation walk through the setup.',
  },
  {
    q: 'Which AI models are supported?',
    a: 'Google Gemini is wired in by default for answers. The LLM and embedding layers are configurable, so an OpenAI-compatible or self-hosted model can be swapped in on the self-hosted version.',
  },
  {
    q: 'Where are my documents stored?',
    a: 'Extracted text is chunked, embedded and stored in Qdrant, a vector database, alongside metadata about the source document and page — scoped to your workspace.',
  },
  {
    q: 'Can I use it for a team?',
    a: 'Yes. The Team plan adds a shared workspace, multiple members, shared knowledge bases and team analytics.',
  },
]

export default function Faq({ items = FAQ_ITEMS }: { items?: FaqItem[] }) {
  return (
    <div className="faq">
      {items.map((f) => (
        <details className="faq__item" key={f.q}>
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  )
}
