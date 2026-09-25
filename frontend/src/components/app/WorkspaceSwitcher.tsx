import { useState } from 'react'
import { ChevronsUpDown, Check, Plus, Building2 } from 'lucide-react'
import { useWorkspace } from '../../lib/workspace'
import { useDismiss } from '../../lib/hooks'
import { useToast } from '../ui/Toast'

export default function WorkspaceSwitcher() {
  const { workspaces, currentWorkspace, switchWorkspace, createWorkspace } = useWorkspace()
  const [open, setOpen] = useState(false)
  const toast = useToast()
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false))

  async function onCreate() {
    const name = window.prompt('Name your new workspace')
    if (!name?.trim()) return
    try {
      await createWorkspace(name.trim())
      toast('ok', `Created workspace "${name.trim()}".`)
      setOpen(false)
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Could not create the workspace.')
    }
  }

  return (
    <div className="wsswitch" ref={ref}>
      <button
        className="wsswitch__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="wsswitch__icon">
          <Building2 size={15} />
        </span>
        <span className="truncate">{currentWorkspace?.name ?? 'No workspace'}</span>
        <ChevronsUpDown size={14} className="muted" />
      </button>

      {open && (
        <div className="wsswitch__menu">
          {workspaces.length === 0 && <p className="wsswitch__empty muted">You have no workspaces yet.</p>}
          {workspaces.map((w) => (
            <button
              key={w.id}
              className="wsswitch__item"
              onClick={() => {
                switchWorkspace(w.id)
                setOpen(false)
              }}
            >
              <span className="truncate">{w.name}</span>
              {w.id === currentWorkspace?.id && <Check size={14} />}
            </button>
          ))}
          <button className="wsswitch__item wsswitch__item--add" onClick={onCreate}>
            <Plus size={14} />
            Create workspace
          </button>
        </div>
      )}
    </div>
  )
}
