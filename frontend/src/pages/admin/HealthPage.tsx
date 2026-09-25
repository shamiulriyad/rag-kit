import { RefreshCw } from 'lucide-react'
import HealthStatusCard from '../../components/admin/HealthStatusCard'
import { ErrorState, LoadingSkeleton } from '../../components/admin/states'
import { Button } from '../../components/ui/Button'
import { useAsync } from '../../lib/adminHooks'
import { adminApi } from '../../services/adminApi'

export default function HealthPage() {
  const { data, loading, error, reload } = useAsync(() => adminApi.health(), [])
  if (error && !data) return <ErrorState message={error} onRetry={reload} />
  if (!data) return <LoadingSkeleton lines={8} height={18} />

  return (
    <div className="apage">
      <div className="apage__bar">
        <p className="muted">Each check is a live probe made when this page loads.</p>
        <Button variant="secondary" size="sm" onClick={reload} disabled={loading}>
          <RefreshCw size={14} /> Re-check
        </Button>
      </div>
      <div className="hgrid">
        {data.services.map((s) => (
          <HealthStatusCard key={s.id} service={s} />
        ))}
      </div>
      {!data.incidentsTracked && (
        <p className="muted" style={{ fontSize: '0.78rem' }}>
          Incident history is not recorded yet, so only the current state is shown.
        </p>
      )}
    </div>
  )
}
