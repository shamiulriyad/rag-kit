import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HelpCircle, Keyboard, BookOpen } from 'lucide-react'
import { useUI } from '../../lib/ui'
import { useDismiss } from '../../lib/hooks'
import { GithubIcon } from '../ui/icons'

export default function HelpMenu() {
  const { setShortcutsOpen } = useUI()
  const [open, setOpen] = useState(false)
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false))

  return (
    <div className="popover" ref={ref}>
      <button
        className="iconbtn"
        aria-label="Help"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <HelpCircle size={17} />
      </button>

      {open && (
        <div className="popover__panel menu" role="menu">
          <button
            className="menu__item"
            onClick={() => {
              setShortcutsOpen(true)
              setOpen(false)
            }}
          >
            <Keyboard size={15} />
            Keyboard shortcuts
            <kbd>?</kbd>
          </button>
          <Link className="menu__item" to="/docs" onClick={() => setOpen(false)}>
            <BookOpen size={15} />
            Documentation
          </Link>
          <a
            className="menu__item"
            href="https://github.com/shamiulriyad/rag-kit"
            target="_blank"
            rel="noreferrer noopener"
            onClick={() => setOpen(false)}
          >
            <GithubIcon size={15} />
            GitHub repository
          </a>
        </div>
      )}
    </div>
  )
}
