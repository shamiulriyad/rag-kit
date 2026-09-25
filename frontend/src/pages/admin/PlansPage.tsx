import DataTable, { type Column } from '../../components/admin/DataTable'
import { useAsync } from '../../lib/adminHooks'
import { formatBytes, formatNumber } from '../../lib/format'
import { adminApi, type AdminPlanItem } from '../../services/adminApi'

const lim = (n: number) => (n < 0 || n >= 2_000_000_000 ? 'Unlimited' : formatNumber(n))

const COLUMNS: Column<AdminPlanItem>[] = [
  { key: 'name', header: 'Plan', render: (p) => <strong>{p.name}</strong> },
  { key: 'm', header: 'Monthly', align: 'right', render: (p) => `$${p.priceMonthly}` },
  { key: 'y', header: 'Yearly', align: 'right', wide: true, render: (p) => `$${p.priceYearly}` },
  { key: 'u', header: 'Users', align: 'right', render: (p) => formatNumber(p.users) },
  { key: 'kb', header: 'Knowledge bases', align: 'right', wide: true, render: (p) => lim(p.maxKnowledgeBases) },
  { key: 'd', header: 'Documents', align: 'right', wide: true, render: (p) => lim(p.maxDocuments) },
  { key: 's', header: 'Storage', align: 'right', wide: true, render: (p) => (p.maxStorageBytes < 0 ? 'Unlimited' : formatBytes(p.maxStorageBytes)) },
  { key: 'q', header: 'Questions / mo', align: 'right', wide: true, render: (p) => lim(p.maxQuestionsPerMonth) },
]

export default function PlansPage() {
  const list = useAsync(() => adminApi.plans(), [])
  return (
    <div className="apage">
      <DataTable
        columns={COLUMNS}
        rows={list.data ?? undefined}
        rowKey={(p) => p.code}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        emptyTitle="No plans"
        emptyHint="No plans are configured."
        page={1}
        pageSize={100}
        total={list.data?.length ?? 0}
        onPageChange={() => {}}
      />
    </div>
  )
}
