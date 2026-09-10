import { Fragment } from 'react'
import { ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface FlowNode {
  label: string
  icon?: LucideIcon
  primary?: boolean
}

export default function PipelineFlow({
  title,
  nodes,
  caption,
}: {
  title?: string
  nodes: FlowNode[]
  caption?: string
}) {
  return (
    <div className="flow">
      <div className="flow__head">
        <span className="flow__label">{title ?? 'Pipeline'}</span>
        <span className="flow__dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
      </div>
      <div className="flow__lane">
        {nodes.map((n, i) => (
          <Fragment key={n.label}>
            <span className={`flow__node${n.primary ? ' flow__node--primary' : ''}`}>
              {n.icon && <n.icon />}
              {n.label}
            </span>
            {i < nodes.length - 1 && (
              <span className="flow__arrow" aria-hidden>
                <ArrowRight />
              </span>
            )}
          </Fragment>
        ))}
      </div>
      {caption && <p style={{ fontSize: '0.8rem', marginTop: 4 }}>{caption}</p>}
    </div>
  )
}
