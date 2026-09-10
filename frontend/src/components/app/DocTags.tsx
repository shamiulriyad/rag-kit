import { useState, type KeyboardEvent } from 'react'
import { X, Plus } from 'lucide-react'
import { useWorkspace } from '../../lib/workspace'
import { useDismiss } from '../../lib/hooks'

export default function DocTags({ docId }: { docId: string }) {
  const { tagsByDoc, allTags, addTagToDoc, removeTagFromDoc, createTag } =
    useWorkspace()
  const tags = tagsByDoc[docId] ?? []
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false))

  const available = allTags.filter((t) => !tags.includes(t))

  function commitNew(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const v = draft.trim()
    if (!v) return
    createTag(v)
    addTagToDoc(docId, v)
    setDraft('')
  }

  return (
    <div className="tags" style={{ position: 'relative' }} ref={ref}>
      {tags.map((t) => (
        <span key={t} className="tag">
          {t}
          <button
            aria-label={`Remove ${t}`}
            onClick={() => removeTagFromDoc(docId, t)}
          >
            <X size={11} />
          </button>
        </span>
      ))}

      <button className="tag tag--add" onClick={() => setOpen((v) => !v)}>
        <Plus size={11} />
        Tag
      </button>

      {open && (
        <div className="tag-pop">
          {available.map((t) => (
            <button
              key={t}
              onClick={() => {
                addTagToDoc(docId, t)
                setOpen(false)
              }}
            >
              {t}
            </button>
          ))}
          <input
            className="input"
            style={{ marginTop: 4 }}
            placeholder="New tag + Enter"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={commitNew}
          />
        </div>
      )}
    </div>
  )
}
