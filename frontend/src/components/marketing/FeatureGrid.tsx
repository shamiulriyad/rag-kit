import {
  FileSearch,
  Quote,
  Database,
  Layers,
  BookMarked,
  Users,
  Gauge,
  SlidersHorizontal,
  Code2,
  Server,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface FeatureItem {
  icon: LucideIcon
  title: string
  body: string
}

export const FEATURES: FeatureItem[] = [
  {
    icon: FileSearch,
    title: 'Document Intelligence',
    body: 'Upload PDFs and have them extracted, cleaned and indexed automatically.',
  },
  {
    icon: Quote,
    title: 'Source-Grounded Answers',
    body: 'Every answer cites the exact document and page it came from.',
  },
  {
    icon: Database,
    title: 'Knowledge Bases',
    body: 'Group related documents into a knowledge base you can ask questions across.',
  },
  {
    icon: Layers,
    title: 'Multi-Document Search',
    body: 'Retrieval spans every document in scope, not just one file at a time.',
  },
  {
    icon: BookMarked,
    title: 'Citation & Page References',
    body: 'Jump straight to the page an answer was grounded in.',
  },
  {
    icon: Users,
    title: 'Workspace Collaboration',
    body: 'Invite your team into a shared workspace with roles and permissions.',
  },
  {
    icon: Gauge,
    title: 'Usage Tracking',
    body: 'See documents, questions and storage used at a glance.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Configurable RAG',
    body: 'Tune chunking, retrieval and model settings when you need to.',
  },
  {
    icon: Code2,
    title: 'Developer API',
    body: 'Call the same pipeline programmatically with an API key.',
  },
  {
    icon: Server,
    title: 'Self-Hosted Option',
    body: 'Run the open-source RAG Starter on your own infrastructure instead.',
  },
]

export default function FeatureGrid({ items = FEATURES }: { items?: FeatureItem[] }) {
  return (
    <div className="features__grid">
      {items.map((f) => (
        <article className="card card--interactive feature" key={f.title}>
          <span className="feature__icon">
            <f.icon />
          </span>
          <h3>{f.title}</h3>
          <p>{f.body}</p>
        </article>
      ))}
    </div>
  )
}
