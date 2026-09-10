import type { DocStatus } from '../../lib/mockData'

type Tone = 'ok' | 'busy' | 'warn' | 'bad'

const MAP: Record<string, { tone: Tone; label: string }> = {
  ready: { tone: 'ok', label: 'Ready' },
  processing: { tone: 'busy', label: 'Processing' },
  failed: { tone: 'bad', label: 'Failed' },
  ok: { tone: 'ok', label: 'Operational' },
}

export default function StatusPill({
  status,
  label,
}: {
  status: DocStatus | 'ok'
  label?: string
}) {
  const cfg = MAP[status] ?? { tone: 'warn' as Tone, label: status }
  return (
    <span className={`pill pill--${cfg.tone}`}>
      <span className="pill__dot" aria-hidden />
      {label ?? cfg.label}
    </span>
  )
}
