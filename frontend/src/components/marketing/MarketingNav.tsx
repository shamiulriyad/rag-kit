import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Logo from '../ui/Logo'
import { GithubIcon } from '../ui/icons'
import { Button, LinkButton } from '../ui/Button'
import { useAuth } from '../../lib/auth'
import { useIsAdmin } from '../app/AdminRoute'

const LINKS = [
  { label: 'Product', to: '/product' },
  { label: 'Developers', to: '/developers' },
  { label: 'Features', to: '/features' },
  { label: 'How It Works', to: '/how-it-works' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Documentation', to: '/docs' },
]

const GITHUB_URL = 'https://github.com/shamiulriyad/rag-kit'

export default function MarketingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { user, signOut } = useAuth()
  const isAdmin = useIsAdmin()
  // Signed-in visitors get a way back into the app instead of Sign In / Start Free.
  const home = isAdmin ? { to: '/admin', label: 'Admin Panel' } : { to: '/dashboard', label: 'Dashboard' }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`mnav${scrolled ? ' mnav--scrolled' : ''}`}>
      <div className="container mnav__inner">
        <Logo />

        <nav className="mnav__links">
          {LINKS.map((l) => (
            <Link key={l.label} className="mnav__link" to={l.to}>
              {l.label}
            </Link>
          ))}
          <a
            className="mnav__link"
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
          >
            GitHub
          </a>
        </nav>

        <div className="mnav__actions">
          {user ? (
            <>
              <Button variant="secondary" size="sm" onClick={signOut}>
                Sign out
              </Button>
              <LinkButton size="sm" to={home.to}>
                {home.label}
              </LinkButton>
            </>
          ) : (
            <>
              <LinkButton variant="secondary" size="sm" to="/login">
                Sign In
              </LinkButton>
              <LinkButton size="sm" to="/signup">
                Start Free
              </LinkButton>
            </>
          )}
          <button
            className="mnav__toggle"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <div className={`mnav__mobile${open ? ' mnav__mobile--open' : ''}`}>
        {LINKS.map((l) => (
          <Link key={l.label} to={l.to} onClick={() => setOpen(false)}>
            {l.label}
          </Link>
        ))}
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer noopener"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <GithubIcon size={15} />
          GitHub
        </a>
        {user ? (
          <>
            <Link to={home.to} onClick={() => setOpen(false)}>
              {home.label}
            </Link>
            <button
              className="mnav__signout"
              onClick={() => {
                setOpen(false)
                signOut()
              }}
            >
              Sign out
            </button>
          </>
        ) : (
          <Link to="/login" onClick={() => setOpen(false)}>
            Sign In
          </Link>
        )}
      </div>
    </header>
  )
}
