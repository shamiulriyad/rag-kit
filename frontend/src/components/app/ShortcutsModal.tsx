import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useUI } from '../../lib/ui'

const GROUPS: { title: string; items: [string[], string][] }[] = [
  {
    title: 'General',
    items: [
      [['Ctrl', 'K'], 'Global search'],
      [['Ctrl', 'N'], 'New chat'],
      [['Ctrl', 'U'], 'Upload document'],
      [['?'], 'Open this dialog'],
      [['Esc'], 'Close modal or menu'],
    ],
  },
  {
    title: 'Navigation',
    items: [
      [['G', 'D'], 'Go to Dashboard'],
      [['G', 'C'], 'Go to Knowledge Chat'],
      [['G', 'P'], 'Go to RAG Playground'],
    ],
  },
]

export default function ShortcutsModal() {
  const { shortcutsOpen, setShortcutsOpen } = useUI()

  useEffect(() => {
    if (!shortcutsOpen) return
    const onKey = (e: KeyboardEvent) =>
      e.key === 'Escape' && setShortcutsOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcutsOpen, setShortcutsOpen])

  if (!shortcutsOpen) return null

  return (
    <div className="modal-scrim" onClick={() => setShortcutsOpen(false)}>
      <div
        className="modal modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn btn--ghost btn--sm modal__close"
          onClick={() => setShortcutsOpen(false)}
          aria-label="Close"
        >
          <X size={16} />
        </button>
        <h3 id="shortcuts-title">Keyboard shortcuts</h3>
        <p className="muted" style={{ fontSize: '0.82rem' }}>
          Some navigation chords are illustrative for now and will be wired up as
          those pages settle.
        </p>

        <div className="shortcuts">
          {GROUPS.map((g) => (
            <div key={g.title} className="shortcuts__group">
              <div className="shortcuts__title">{g.title}</div>
              {g.items.map(([keys, label]) => (
                <div key={label} className="shortcuts__row">
                  <span>{label}</span>
                  <span className="shortcuts__keys">
                    {keys.map((k) => (
                      <kbd key={k}>{k}</kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
