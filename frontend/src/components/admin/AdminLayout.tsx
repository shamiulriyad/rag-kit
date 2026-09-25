import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'
import AdminHeader from './AdminHeader'

/** The operator console. Separate from the customer app's layout on purpose: its own navigation,
 *  its own header, and nothing on it is scoped to a single user. */
export default function AdminLayout() {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="alayout">
      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}
      <AdminSidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="alayout__main">
        <AdminHeader onMenu={() => setNavOpen(true)} />
        <main className="alayout__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
