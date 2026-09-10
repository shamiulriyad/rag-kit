/* Sample data for the dashboard / documents / chat views. The app calls the
   real .NET backend where an endpoint exists (health, upload, chat) and falls
   back to this so the UI is always demonstrable offline. */

export type DocStatus = 'ready' | 'processing' | 'failed'

export interface DocRecord {
  id: string
  name: string
  sizeBytes: number
  pages: number
  chunks: number
  status: DocStatus
  uploadedAt: string
  note?: string
}

export const mockDocuments: DocRecord[] = [
  {
    id: 'doc_eng_grammar',
    name: 'English-Grammar-In-Use.pdf',
    sizeBytes: 8_412_160,
    pages: 394,
    chunks: 1187,
    status: 'ready',
    uploadedAt: '2026-09-09T14:12:00Z',
  },
  {
    id: 'doc_platform_spec',
    name: 'Platform-Architecture-Spec-v3.pdf',
    sizeBytes: 2_290_688,
    pages: 68,
    chunks: 214,
    status: 'ready',
    uploadedAt: '2026-09-10T09:41:00Z',
  },
  {
    id: 'doc_onboarding',
    name: 'Employee-Onboarding-Handbook.pdf',
    sizeBytes: 5_138_432,
    pages: 132,
    chunks: 486,
    status: 'processing',
    uploadedAt: '2026-09-11T08:55:00Z',
  },
  {
    id: 'doc_research',
    name: 'Retrieval-Augmented-Generation-Survey.pdf',
    sizeBytes: 1_884_160,
    pages: 41,
    chunks: 133,
    status: 'ready',
    uploadedAt: '2026-09-08T17:20:00Z',
  },
  {
    id: 'doc_scanned',
    name: 'Scanned-Invoice-Batch-Q2.pdf',
    sizeBytes: 12_680_192,
    pages: 56,
    chunks: 0,
    status: 'failed',
    uploadedAt: '2026-09-10T19:03:00Z',
    note: 'This PDF appears to be scanned / image-based. OCR is required before indexing.',
  },
]

export interface RecentQuestion {
  id: string
  question: string
  document: string
  askedAt: string
  sources: number
}

export const mockQuestions: RecentQuestion[] = [
  {
    id: 'q1',
    question: 'When do we use the present perfect versus the past simple?',
    document: 'English-Grammar-In-Use.pdf',
    askedAt: '2026-09-11T10:22:00Z',
    sources: 3,
  },
  {
    id: 'q2',
    question: 'How does the frontend reach the Python RAG service?',
    document: 'Platform-Architecture-Spec-v3.pdf',
    askedAt: '2026-09-11T09:15:00Z',
    sources: 2,
  },
  {
    id: 'q3',
    question: 'What is the recommended chunk overlap for long documents?',
    document: 'Retrieval-Augmented-Generation-Survey.pdf',
    askedAt: '2026-09-10T18:40:00Z',
    sources: 4,
  },
  {
    id: 'q4',
    question: 'What benefits are available during the probation period?',
    document: 'Employee-Onboarding-Handbook.pdf',
    askedAt: '2026-09-10T16:05:00Z',
    sources: 2,
  },
]

export const sampleAnswer = `The **present perfect** links a past action to the present moment, while the **past simple** describes a finished action at a definite past time.

### Present perfect ( \`have / has\` + past participle )
- The time is **unspecified** or still relevant now: _"I have read that chapter."_
- Used with \`just\`, \`already\`, \`yet\`, \`ever\`, \`since\`, and \`for\`.

### Past simple
- The time **is** specified: _"I read that chapter yesterday."_
- Common with \`ago\`, \`last week\`, \`in 2019\`.

> Rule of thumb: if you can name *when* it happened, use the past simple.`

export const sampleSources = [
  { document: 'English-Grammar-In-Use.pdf', page: 132, score: 0.912 },
  { document: 'English-Grammar-In-Use.pdf', page: 141, score: 0.874 },
  { document: 'English-Grammar-In-Use.pdf', page: 96, score: 0.803 },
]

export const suggestedPrompts = [
  'Summarize the key ideas in three bullet points.',
  'What does the document say about configuration?',
  'List every limitation mentioned in the text.',
  'Explain the retrieval pipeline step by step.',
]

export const systemHealth = [
  { name: 'React frontend', status: 'ok' as const, detail: 'v0.1 · served' },
  { name: 'ASP.NET Core API', status: 'ok' as const, detail: 'localhost:5038' },
  { name: 'Python RAG service', status: 'ok' as const, detail: '/ingest · /query' },
  { name: 'Qdrant vector store', status: 'ok' as const, detail: 'server mode · :6333' },
  { name: 'Gemini API', status: 'ok' as const, detail: 'gemini-1.5-pro' },
]
