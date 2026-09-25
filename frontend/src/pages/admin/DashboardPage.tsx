import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Activity,
  Building2,
  Database,
  FileText,
  MessageSquare,
  Cpu,
  HardDrive,
  Sparkles,
  CreditCard,
  HeartPulse,
} from 'lucide-react'
import MetricCard from '../../components/admin/MetricCard'
import UsageChart from '../../components/admin/UsageChart'
import HealthStatusCard from '../../components/admin/HealthStatusCard'
import AuditLogTable from '../../components/admin/AuditLogTable'
import StatusBadge from '../../components/admin/StatusBadge'
import PermissionGuard from '../../components/admin/PermissionGuard'
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/admin/states'
import { useAsync } from '../../lib/adminHooks'
import { formatBytes, formatNumber, relativeTime } from '../../lib/format'
import { adminApi } from '../../services/adminApi'

const RANGES = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
]

export default function DashboardPage() {
  const [days, setDays] = useState(30)

  const dash = useAsync(() => adminApi.dashboard(days), [days])
  const series = useAsync(() => adminApi.timeseries(days), [days])
  const health = useAsync(() => adminApi.health(), [])
  const failed = useAsync(() => adminApi.jobs({ status: 'Failed', page: 1, pageSize: 5 }), [])
  const audit = useAsync(() => adminApi.audit({ page: 1, pageSize: 5 }), [])

  const d = dash.data
  const services = health.data?.services ?? []
  const healthy = services.filter((s) => s.status === 'healthy').length
  const needsAttention = services.filter((s) => s.status === 'down' || s.status === 'degraded').length

  if (dash.error && !d) return <ErrorState message={dash.error} onRetry={dash.reload} />

  const rangeLabel = RANGES.find((r) => r.value === days)?.label.toLowerCase() ?? `last ${days} days`

  return (
    <div className="apage">
      <div className="apage__toolbar">
        <p className="muted">Live figures from the platform database. Activity numbers cover the {rangeLabel}.</p>
        <label className="fbar__filter">
          <span>Date range</span>
          <select className="select" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="metrics">
        <MetricCard label="Total users" icon={Users} loading={!d} value={d && formatNumber(d.totalUsers)}
          hint={d && `${d.newUsers} new · ${d.suspendedUsers} suspended`} to="/admin/users" />
        <MetricCard label="Active users" icon={Activity} loading={!d} value={d && formatNumber(d.activeUsers)}
          hint="Signed in during the range" to="/admin/users" />
        <MetricCard label="Workspaces" icon={Building2} loading={!d} value={d && formatNumber(d.workspaces)} to="/admin/workspaces" />
        <MetricCard label="Knowledge bases" icon={Database} loading={!d} value={d && formatNumber(d.knowledgeBases)} to="/admin/knowledge-bases" />
        <MetricCard label="Uploaded documents" icon={FileText} loading={!d} value={d && formatNumber(d.documents)}
          hint={d && `${formatNumber(d.chunks)} chunks indexed`} to="/admin/documents" />
        <MetricCard label="Questions asked" icon={MessageSquare} loading={!d} value={d && formatNumber(d.questions)}
          hint={d && `${formatNumber(d.totalQuestions)} all time`} />
        <MetricCard label="Failed RAG jobs" icon={Cpu} loading={!d} value={d && formatNumber(d.failedJobs)}
          hint={d && `${d.pendingJobs} queued or running now`} tone={d && d.failedJobs > 0 ? 'danger' : undefined}
          to="/admin/jobs?status=Failed" />
        <MetricCard label="Storage usage" icon={HardDrive} loading={!d} value={d && formatBytes(d.storageBytes)} hint="Uploaded PDF size" />
        <MetricCard label="AI usage" icon={Sparkles} loading={!d} value={d && formatNumber(d.questions)}
          hint="Answers generated. Token usage is not recorded." />
        <MetricCard label="Subscriptions" icon={CreditCard} loading={!d} value={d && `${d.paidUsers} paid`}
          hint={d && `Est. $${d.estimatedMrr.toFixed(0)}/mo · not verified billing`} to="/admin/subscriptions" />
        <MetricCard label="System health" icon={HeartPulse} loading={health.loading && services.length === 0}
          value={services.length ? `${healthy}/${services.length} healthy` : '—'}
          hint={needsAttention ? `${needsAttention} need attention` : 'Live probe'}
          tone={needsAttention ? 'warning' : undefined} to="/admin/health" />
      </div>

      <div className="agrid agrid--3">
        <UsageChart title="User growth" subtitle="New sign-ups per day" points={series.data?.signups} days={days} loading={series.loading && !series.data} />
        <UsageChart title="Question activity" subtitle="Questions asked per day" points={series.data?.questions} days={days} loading={series.loading && !series.data} />
        <UsageChart title="Document processing" subtitle="Jobs completed per day" points={series.data?.documentsCompleted} days={days} loading={series.loading && !series.data} />
      </div>

      <div className="agrid agrid--2">
        <UsageChart title="Users by plan" bars={(d?.plans ?? []).map((p) => ({ label: p.plan, value: p.users }))} loading={!d} height={120} />
        <UsageChart title="Documents by status" bars={(d?.documentStatuses ?? []).map((s) => ({ label: s.status, value: s.count }))} loading={!d} height={120} />
      </div>

      <div className="agrid agrid--2">
        <section className="acard">
          <header className="acard__head">
            <h3>Failed jobs</h3>
            <Link to="/admin/jobs?status=Failed">View all</Link>
          </header>
          {failed.error ? (
            <ErrorState message={failed.error} onRetry={failed.reload} />
          ) : failed.loading && !failed.data ? (
            <LoadingSkeleton lines={4} />
          ) : failed.data?.items.length ? (
            <ul className="alist">
              {failed.data.items.map((j) => (
                <li key={j.id}>
                  <div>
                    <Link to={`/admin/jobs/${j.id}`}>{j.document}</Link>
                    <span className="clip">{j.error ?? 'No error recorded'}</span>
                  </div>
                  <span className="muted nowrap">{relativeTime(j.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No failed jobs" hint="Every processing job that has run has succeeded." />
          )}
        </section>

        <section className="acard">
          <header className="acard__head">
            <h3>Service health</h3>
            <Link to="/admin/health">Details</Link>
          </header>
          {health.error ? (
            <ErrorState message={health.error} onRetry={health.reload} />
          ) : health.loading && services.length === 0 ? (
            <LoadingSkeleton lines={6} />
          ) : (
            <ul className="hlist">
              {services.map((s) => (
                <HealthStatusCard key={s.id} service={s} compact />
              ))}
            </ul>
          )}
        </section>
      </div>

      <PermissionGuard permission="audit.view">
        <section className="acard">
          <header className="acard__head">
            <h3>Recent audit activity</h3>
            <Link to="/admin/audit">View all</Link>
          </header>
          <AuditLogTable rows={audit.data?.items} loading={audit.loading} error={audit.error} onRetry={audit.reload} />
        </section>
      </PermissionGuard>

      {d && (
        <p className="muted" style={{ fontSize: '0.78rem' }}>
          Subscription figures are estimates (paid users × plan price). No payment provider is connected, so nothing here is
          verified billing. Plan status: <StatusBadge status={d.paidUsers > 0 ? 'active' : 'unknown'} label={`${d.paidUsers} paid`} />
        </p>
      )}
    </div>
  )
}
