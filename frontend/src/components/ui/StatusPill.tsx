type Tone = 'ok' | 'busy' | 'warn' | 'bad'

// Lowercased so it matches both the backend's PascalCase DocumentStatus
// ("Uploading" | "Queued" | "Processing" | "Completed" | "Failed") and any
// literal lowercase status passed in directly (e.g. "ok").
const MAP: Record<string, { tone: Tone; label: string }> = {
  uploading: { tone: 'busy', label: 'Uploading' },
  queued: { tone: 'busy', label: 'Queued' },
  processing: { tone: 'busy', label: 'Processing' },
  completed: { tone: 'ok', label: 'Ready' },
  ready: { tone: 'ok', label: 'Ready' },
  failed: { tone: 'bad', label: 'Failed' },
  ok: { tone: 'ok', label: 'Operational' },
}

export default function StatusPill({ status, label }: { status: string; label?: string }) {
  const cfg = MAP[status.toLowerCase()] ?? { tone: 'warn' as Tone, label: status }
  return (
    <span className={`pill pill--${cfg.tone}`}>
      <span className="pill__dot" aria-hidden />
      {label ?? cfg.label}
    </span>
  )
}
