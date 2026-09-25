import { useEffect, useState } from 'react'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import { ErrorState, LoadingSkeleton } from '../../components/admin/states'
import StatusBadge from '../../components/admin/StatusBadge'
import { Button } from '../../components/ui/Button'
import { Field, Textarea } from '../../components/ui/Field'
import { useToast } from '../../components/ui/Toast'
import { useAdmin } from '../../lib/admin'
import { useAsync } from '../../lib/adminHooks'
import { relativeTime } from '../../lib/format'
import { adminApi } from '../../services/adminApi'

/** Two switches the platform really obeys: maintenance mode (customers get 503, admins keep working)
 *  and whether new accounts can be created. Both are enforced by the API, not by this page. */
export default function SettingsAdminPage() {
  const toast = useToast()
  const { can } = useAdmin()
  const canEdit = can('settings.manage')
  const { data, error, reload } = useAsync(() => adminApi.settings(), [])

  const [maintenance, setMaintenance] = useState(false)
  const [message, setMessage] = useState('')
  const [signups, setSignups] = useState(true)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (data) {
      setMaintenance(data.maintenanceMode)
      setMessage(data.maintenanceMessage)
      setSignups(data.signupsEnabled)
    }
  }, [data])

  if (error && !data) return <ErrorState message={error} onRetry={reload} />
  if (!data) return <LoadingSkeleton lines={6} height={18} />

  const dirty = maintenance !== data.maintenanceMode || message !== data.maintenanceMessage || signups !== data.signupsEnabled
  const turningOnMaintenance = maintenance && !data.maintenanceMode

  async function save() {
    setBusy(true)
    setFormError(null)
    try {
      await adminApi.saveSettings({ maintenanceMode: maintenance, maintenanceMessage: message.trim(), signupsEnabled: signups })
      toast('ok', 'Settings saved. They apply immediately.')
      reload()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not save settings.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="apage">
      <section className="acard settings">
        <header className="acard__head">
          <h3>Maintenance mode</h3>
          <StatusBadge status={data.maintenanceMode ? 'pending' : 'active'} label={data.maintenanceMode ? 'On' : 'Off'} />
        </header>
        <label className="switch">
          <input type="checkbox" checked={maintenance} disabled={!canEdit} onChange={(e) => setMaintenance(e.target.checked)} />
          <span>Refuse customer requests while I work on the platform</span>
        </label>
        <p className="muted">
          Customers see your message and every customer API call returns 503. Platform admins, sign-in and this panel keep
          working, so you can switch it back off.
        </p>
        <Field label="Message shown to customers" hint="Optional. A default message is used if left empty.">
          {(id) => (
            <Textarea id={id} rows={3} maxLength={300} value={message} disabled={!canEdit} onChange={(e) => setMessage(e.target.value)} />
          )}
        </Field>
      </section>

      <section className="acard settings">
        <header className="acard__head">
          <h3>New sign-ups</h3>
          <StatusBadge status={data.signupsEnabled ? 'active' : 'failed'} label={data.signupsEnabled ? 'Open' : 'Closed'} />
        </header>
        <label className="switch">
          <input type="checkbox" checked={signups} disabled={!canEdit} onChange={(e) => setSignups(e.target.checked)} />
          <span>Allow new accounts to be created</span>
        </label>
        <p className="muted">When closed, the sign-up form explains it and the API refuses registration. Existing users are not affected.</p>
      </section>

      {formError && (
        <p className="field__error" role="alert">
          {formError}
        </p>
      )}
      <div className="rowactions">
        {canEdit && (
          <Button onClick={() => (turningOnMaintenance ? setConfirm(true) : save())} loading={busy} disabled={!dirty}>
            Save settings
          </Button>
        )}
        {dirty && canEdit && (
          <Button
            variant="ghost"
            onClick={() => {
              setMaintenance(data.maintenanceMode)
              setMessage(data.maintenanceMessage)
              setSignups(data.signupsEnabled)
            }}
          >
            Discard changes
          </Button>
        )}
        <span className="muted" style={{ fontSize: '0.78rem' }}>
          {data.updatedAt ? `Last changed ${relativeTime(data.updatedAt)} by ${data.updatedBy}` : 'Never changed: defaults are in effect.'}
        </span>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Turn on maintenance mode?"
        description="All customers are locked out immediately. You and other platform admins are not. This is recorded in the audit log."
        confirmLabel="Turn on"
        danger
        onClose={() => setConfirm(false)}
        onConfirm={save}
      />
    </div>
  )
}
