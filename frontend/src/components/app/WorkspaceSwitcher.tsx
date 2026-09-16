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

  function onCreate() {
    const name = window.prompt('Name your new workspace')
    if (!name?.trim()) return
    createWorkspace(name.trim())
    toast('ok', `Created workspace "${name.trim()}".`)
    setOpen(false)
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
        <span className="truncate">{currentWorkspace?.name ?? 'Workspace'}</span>
        <ChevronsUpDown size={14} className="muted" />
      </button>

      {open && (
        <div className="wsswitch__menu">
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
