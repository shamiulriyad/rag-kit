import { useLocation } from 'react-router-dom'
import { EmptyState } from '../../components/admin/states'
import { ADMIN_NAV } from '../../lib/adminNav'

/** Modules the panel plans but the backend does not support yet. Says so plainly instead of
 *  rendering a screen full of made-up data. */
export default function ComingSoonPage() {
  const { pathname } = useLocation()
  const item = ADMIN_NAV.flatMap((g) => g.items).find((i) => i.to === pathname)
  return (
    <div className="apage">
      <section className="acard">
        <EmptyState
          title={`${item?.label ?? 'This module'} is not available yet`}
          hint="It needs backend support that has not been built. No placeholder data is shown."
        />
      </section>
    </div>
  )
}
