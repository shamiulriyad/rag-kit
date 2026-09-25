import { useState } from 'react'
import { Link } from 'react-router-dom'
import DataTable, { type Column } from '../../components/admin/DataTable'
import MetricCard from '../../components/admin/MetricCard'
import UsageChart from '../../components/admin/UsageChart'
import { ErrorState } from '../../components/admin/states'
import { useAsync } from '../../lib/adminHooks'
import { formatBytes, formatNumber } from '../../lib/format'
import { adminApi, type AdminUsageResponse } from '../../services/adminApi'

type Top = AdminUsageResponse['topUsers'][number]

const COLUMNS: Column<Top>[] = [
  { key: 'email', header: 'User', render: (u) => <strong>{u.email}</strong> },
  { key: 'plan', header: 'Plan', render: (u) => u.plan },
  { key: 'q', header: 'Questions', align: 'right', render: (u) => formatNumber(u.questions) },
  { key: 'd', header: 'Documents', align: 'right', wide: true, render: (u) => formatNumber(u.documents) },
  { key: 's', header: 'Storage', align: 'right', wide: true, render: (u) => formatBytes(u.storageBytes) },
]

const RANGES = [3, 6, 12]
const usd = (n: number) => `$${n.toFixed(2)}`
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short' })

export default function UsageCostPage() {
  const [months, setMonths] = useState(6)
  const { data, loading, error, reload } = useAsync(() => adminApi.usage(months), [months])

  if (error && !data) return <ErrorState message={error} onRetry={reload} />
  const cur = data?.monthly[data.monthly.length - 1]
  const est = data?.estimate

  return (
    <div className="apage">
      <div className="apage__toolbar">
        <p className="muted">Usage is summed from each user&apos;s monthly usage record.</p>
        <label className="fbar__filter">
          <span>Range</span>
          <select className="select" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            {RANGES.map((m) => (
              <option key={m} value={m}>
                Last {m} months
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="metrics">
        <MetricCard label="Questions this month" loading={!data} value={cur && formatNumber(cur.questions)} />
        <MetricCard label="Documents this month" loading={!data} value={cur && formatNumber(cur.documents)} />
        <MetricCard label="Storage added this month" loading={!data} value={cur && formatBytes(cur.storageBytes)} />
        <MetricCard label="Active users this month" loading={!data} value={cur && formatNumber(cur.activeUsers)} />
      </div>

      <div className="agrid agrid--2">
        <UsageChart
          title="Questions per month"
          loading={loading && !data}
          bars={data?.monthly.map((m) => ({ label: monthLabel(m.month), value: m.questions }))}
        />
        <UsageChart
          title="Documents per month"
          loading={loading && !data}
          bars={data?.monthly.map((m) => ({ label: monthLabel(m.month), value: m.documents }))}
        />
      </div>

      <div className="agrid agrid--2">
        <section className="acard">
          <header className="acard__head">
            <h3>Estimated cost</h3>
            <span className="tag tag--estimate">Estimate</span>
          </header>
          <dl className="kv">
            <dt>AI cost this month</dt>
            <dd>
              {est?.aiCostThisMonth != null ? (
                usd(est.aiCostThisMonth)
              ) : (
                <span className="muted">Not configured</span>
              )}
            </dd>
            <dt>Rate used</dt>
            <dd>{est?.aiCostPerQuestion != null ? `${usd(est.aiCostPerQuestion)} per question` : '—'}</dd>
            <dt>Estimated recurring revenue</dt>
            <dd>
              {est ? `${usd(est.estimatedMonthlyRevenue)} from ${est.paidUsers} paid plan${est.paidUsers === 1 ? '' : 's'}` : '—'}
            </dd>
          </dl>
          <p className="muted" style={{ fontSize: '0.78rem', margin: '12px 0 0' }}>
            Token counts are not recorded, so AI cost is questions multiplied by a rate you set with
            {' '}<code>Admin__EstimatedCostPerQuestionUsd</code>. It is not what the model provider will bill.
          </p>
        </section>

        <section className="acard">
          <header className="acard__head">
            <h3>Verified billing</h3>
            <span className="tag">Not connected</span>
          </header>
          <p className="muted" style={{ margin: 0 }}>
            No payment provider is connected, so there is no verified revenue, invoice or refund data. Subscriptions
            are simulated; see <Link to="/admin/billing-events">Billing Events</Link>.
          </p>
        </section>
      </div>

      <section>
        <h3 className="apage__heading">Top users this month</h3>
        <DataTable
          columns={COLUMNS}
          rows={data?.topUsers}
          rowKey={(u) => u.email}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle="No usage yet this month"
          emptyHint="Users appear here after they ask questions or upload documents."
        />
      </section>
    </div>
  )
}
