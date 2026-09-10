import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/* React Router does not scroll to `#hash` targets on navigation. This watches
   the location and scrolls the matching element into view once it exists —
   so "Features" in the navbar works from any page, not just the landing page. */
export default function ScrollToHash() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 })
      return
    }
    const id = decodeURIComponent(hash.slice(1))
    let tries = 0
    const tick = () => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (tries++ < 20) {
        setTimeout(tick, 50)
      }
    }
    tick()
  }, [pathname, hash])

  return null
}
