import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, Circle, Loader2, X } from 'lucide-react'
import StatusBadge from '../../components/admin/StatusBadge'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import PermissionGuard from '../../components/admin/PermissionGuard'
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/admin/states'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { useAsync } from '../../lib/adminHooks'
import { relativeTime } from '../../lib/format'
import { adminApi } from '../../services/adminApi'
import { formatDuration } from './JobsPage'

const ICON = { done: Check, active: Loader2, failed: X, pending: Circle } as const
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')

export default function JobDetailPage() {
  const { id = '' } = useParams()
  const toast = useToast()
  const [dialog, setDialog] = useState<'retry' | 'reprocess' | null>(null)
  const { data, error, reload } = useAsync(() => adminApi.job(id), [id])

  if (error && !data) return <ErrorState message={error} onRetry={reload} />
  if (!data) return <LoadingSkeleton lines={8} height={18} />
  const { job } = data

  return (
    <div className="apage">
      <section className="acard">
        <div className="uhead">
          <div>
            <h2>{job.document}</h2>
            <p className="muted">
              Job <code>{job.id}</code>
            </p>
            <div className="uhead__meta">
              <StatusBadge status={job.status} />
              <span>
                Attempt {job.attempts}/{job.maxAttempts}
              </span>
              <span>Duration {formatDuration(job.durationSeconds)}</span>
            </div>
          </div>
          <PermissionGuard permission="jobs.manage">
            <div className="rowactions">
              {job.status === 'Failed' && <Button onClick={() => setDialog('retry')}>Retry job</Button>}
              <Button variant="secondary" onClick={() => setDialog('reprocess')}>
                Reprocess document
              </Button>
            </div>
          </PermissionGuard>
        </div>
      </section>

      <section className="acard">
        <h3>Pipeline</h3>
        <ol className="pipeline">
          {data.stages.map((s) => {
            const Icon = ICON[s.state]
            return (
              <li key={s.name} className={`pipeline__stage is-${s.state}`}>
                <Icon size={16} aria-hidden />
                <strong>{s.name}</strong>
                <span>{s.at ? relativeTime(s.at) : s.state}</span>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="acard">
        <h3>Details</h3>
        <dl className="kv">
          <dt>Document</dt>
          <dd>
            {job.document} ({data.documentStatus})
          </dd>
          <dt>Workspace</dt>
          <dd>
            <Link to={`/admin/workspaces?search=${encodeURIComponent(job.workspace)}`}>{job.workspace}</Link>
          </dd>
          <dt>Knowledge base</dt>
          <dd>{data.knowledgeBase}</dd>
          <dt>Owner</dt>
          <dd>{data.ownerEmail}</dd>
          <dt>Created</dt>
          <dd>{when(job.createdAt)}</dd>
          <dt>Started</dt>
          <dd>{when(job.startedAt)}</dd>
          <dt>Completed</dt>
          <dd>{when(job.completedAt)}</dd>
        </dl>
      </section>

      {job.error && (
        <section className="acard">
          <h3>Error</h3>
          <p className="field__error">{job.error}</p>
        </section>
      )}

      <section className="acard">
        <h3>Sanitized log</h3>
        {data.log.length === 0 ? (
          <EmptyState title="No log entries" hint="Nothing has been recorded for this job." />
        ) : (
          <ul className="alist">
            {data.log.map((l, i) => (
              <li key={i}>
                <span>{l.message}</span>
                <span className="muted">{when(l.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={dialog !== null}
        title={dialog === 'retry' ? 'Retry this job?' : 'Reprocess this document?'}
        description="A new processing job is queued. This is recorded in the audit log."
        confirmLabel={dialog === 'retry' ? 'Retry job' : 'Reprocess'}
        onClose={() => setDialog(null)}
        onConfirm={async () => {
          if (dialog === 'retry') await adminApi.retryJob(job.id)
          else await adminApi.reprocessDocument(job.documentId)
          toast('ok', 'Queued.')
          reload()
        }}
      />
    </div>
  )
}
