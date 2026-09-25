import BarChart from '../app/charts/BarChart'
import type { TimeSeriesPoint } from '../../services/api'
import { LoadingSkeleton } from './states'

const dayKey = (d: Date) => d.toISOString().slice(0, 10)

/** The API omits days with no events - fill the gaps so the chart shows real zeros. */
export function fillDays(points: TimeSeriesPoint[], days: number) {
  const byDay = new Map(points.map((p) => [p.date.slice(0, 10), p.count]))
  const out: { label: string; value: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push({
      label: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
      value: byDay.get(dayKey(d)) ?? 0,
    })
  }
  return out
}

/** A titled chart card. Pass either day-bucketed `points` or already-labelled `bars`. */
export default function UsageChart({
  title,
  subtitle,
  points,
  days,
  bars,
  loading,
  height = 140,
}: {
  title: string
  subtitle?: string
  points?: TimeSeriesPoint[]
  days?: number
  bars?: { label: string; value: number }[]
  loading?: boolean
  height?: number
}) {
  const data = bars ?? (points && days ? fillDays(points, Math.min(days, 30)) : [])
  return (
    <section className="acard">
      <header className="acard__head">
        <h3>{title}</h3>
        {subtitle && <span>{subtitle}</span>}
      </header>
      {loading ? <LoadingSkeleton lines={4} height={18} /> : <BarChart data={data} height={height} />}
    </section>
  )
}
