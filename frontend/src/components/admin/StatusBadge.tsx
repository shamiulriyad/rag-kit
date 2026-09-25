type Tone = 'success' | 'info' | 'warning' | 'danger' | 'neutral'

/* One place that decides how every status in the admin panel reads. Keys are lowercased;
   anything not listed falls back to neutral with its own text, never a guessed tone. */
const TONES: Record<string, { tone: Tone; label?: string }> = {
  healthy: { tone: 'success', label: 'Healthy' },
  active: { tone: 'success', label: 'Active' },
  completed: { tone: 'success', label: 'Completed' },
  success: { tone: 'success', label: 'Success' },
  accepted: { tone: 'success', label: 'Accepted' },

  queued: { tone: 'info', label: 'Queued' },
  processing: { tone: 'info', label: 'Processing' },
  uploading: { tone: 'info', label: 'Uploading' },

  retrypending: { tone: 'warning', label: 'Retry pending' },
  degraded: { tone: 'warning', label: 'Degraded' },
  pending: { tone: 'warning', label: 'Pending' },
  denied: { tone: 'warning', label: 'Denied' },

  failed: { tone: 'danger', label: 'Failed' },
  down: { tone: 'danger', label: 'Down' },
  suspended: { tone: 'danger', label: 'Suspended' },

  unknown: { tone: 'neutral', label: 'Unknown' },
}

export default function StatusBadge({ status, label }: { status: string; label?: string }) {
  const cfg = TONES[status.toLowerCase()] ?? { tone: 'neutral' as Tone }
  return (
    <span className={`sbadge sbadge--${cfg.tone}`}>
      <span className="sbadge__dot" aria-hidden />
      {label ?? cfg.label ?? status}
    </span>
  )
}
