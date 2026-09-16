interface Point {
  label: string
  value: number
}

/** A small dependency-free bar chart. Values are relative to the max in `data`. */
export default function BarChart({
  data,
  height = 140,
  formatValue = (v: number) => String(v),
}: {
  data: Point[]
  height?: number
  formatValue?: (v: number) => string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div className="barchart" style={{ height }}>
      {data.map((d) => (
        <div className="barchart__col" key={d.label}>
          <span className="barchart__value">{formatValue(d.value)}</span>
          <div className="barchart__track">
            <div
              className="barchart__bar"
              style={{ height: `${Math.max(2, Math.round((d.value / max) * 100))}%` }}
            />
          </div>
          <span className="barchart__label">{d.label}</span>
        </div>
      ))}
    </div>
  )
}
