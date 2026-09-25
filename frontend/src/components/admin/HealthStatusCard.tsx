import { relativeTime } from '../../lib/format'
import type { ServiceHealth } from '../../services/adminApi'
import StatusBadge from './StatusBadge'

export default function HealthStatusCard({ service, compact }: { service: ServiceHealth; compact?: boolean }) {
  if (compact) {
    return (
      <li className="hcard hcard--compact">
        <span>{service.name}</span>
        <StatusBadge status={service.status} />
      </li>
    )
  }
  return (
    <article className="hcard">
      <header>
        <h4>{service.name}</h4>
        <StatusBadge status={service.status} />
      </header>
      <p>{service.detail}</p>
      <dl>
        <div>
          <dt>Response time</dt>
          <dd>{service.responseMs === null ? 'Not measured' : `${service.responseMs} ms`}</dd>
        </div>
        <div>
          <dt>Last checked</dt>
          <dd>{relativeTime(service.checkedAt)}</dd>
        </div>
      </dl>
    </article>
  )
}
