import DataTable, { type Column } from '../../components/admin/DataTable'
import StatusBadge from '../../components/admin/StatusBadge'
import { ErrorState, LoadingSkeleton } from '../../components/admin/states'
import { useAsync } from '../../lib/adminHooks'
import { relativeTime } from '../../lib/format'
import { adminApi, type AdminAdminUser } from '../../services/adminApi'

const COLUMNS: Column<AdminAdminUser>[] = [
  { key: 'name', header: 'Admin', render: (a) => <strong>{a.fullName}</strong> },
  { key: 'email', header: 'Email', render: (a) => a.email },
  { key: 'role', header: 'Role', render: (a) => a.role },
  { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
  { key: 'last', header: 'Last sign-in', wide: true, render: (a) => (a.lastLoginAt ? relativeTime(a.lastLoginAt) : 'Never') },
]

export default function AdminsPage() {
  const admins = useAsync(() => adminApi.admins(), [])
  const roles = useAsync(() => adminApi.roles(), [])

  return (
    <div className="apage">
      <section>
        <h3 className="apage__heading">Admin users</h3>
        <DataTable
          columns={COLUMNS}
          rows={admins.data ?? undefined}
          rowKey={(a) => a.id}
          loading={admins.loading}
          error={admins.error}
          onRetry={admins.reload}
          emptyTitle="No admin accounts"
          emptyHint="Admins are the accounts whose email is listed in the Admin:Emails setting and who have registered."
        />
        <p className="muted" style={{ fontSize: '0.78rem', marginTop: 8 }}>
          Admin access is granted in server configuration, not from this page, so it cannot be changed through the app.
        </p>
      </section>

      <section>
        <h3 className="apage__heading">Roles and permissions</h3>
        {roles.error && !roles.data ? (
          <ErrorState message={roles.error} onRetry={roles.reload} />
        ) : !roles.data ? (
          <LoadingSkeleton lines={4} />
        ) : (
          roles.data.map((r) => (
            <div className="acard" key={r.name}>
              <div className="acard__head">
                <h3>{r.name}</h3>
                <span>{r.permissions.length} permissions</span>
              </div>
              <p className="muted" style={{ marginTop: 0 }}>{r.description}</p>
              <ul className="permlist">
                {r.permissions.map((p) => (
                  <li key={p}>
                    <code>{p}</code>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
