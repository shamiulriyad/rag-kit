import { useEffect, useState } from 'react'
import { Database, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { Field, Input, Textarea } from '../ui/Field'

interface Props {
  open: boolean
  onClose: () => void
  onCreate: (name: string, description: string) => void
}

export default function CreateKbModal({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!open) return
    setName('')
    setDescription('')
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  function submit() {
    if (!name.trim()) return
    onCreate(name.trim(), description.trim())
    onClose()
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-kb-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn btn--ghost btn--sm modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <span className="modal__icon">
          <Database />
        </span>

        <h3 id="create-kb-title">Create a Knowledge Base</h3>
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          A Knowledge Base groups the documents you want to ask questions across.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', width: '100%' }}>
          <Field label="Name" full>
            {(id) => (
              <Input
                id={id}
                autoFocus
                placeholder="e.g. Customer Support Docs"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </Field>
          <Field label="Description" full hint="Optional — what does this knowledge base cover?">
            {(id) => (
              <Textarea
                id={id}
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            )}
          </Field>
        </div>

        <div className="modal__actions">
          <Button block disabled={!name.trim()} onClick={submit}>
            Create Knowledge Base
          </Button>
          <Button variant="ghost" block onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
