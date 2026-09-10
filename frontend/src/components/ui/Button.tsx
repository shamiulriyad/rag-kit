import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface Common {
  variant?: Variant
  size?: Size
  block?: boolean
  loading?: boolean
  children: ReactNode
}

function classes({ variant = 'primary', size = 'md', block }: Common) {
  return [
    'btn',
    `btn--${variant}`,
    size !== 'md' && `btn--${size}`,
    block && 'btn--block',
  ]
    .filter(Boolean)
    .join(' ')
}

type ButtonProps = Common & ButtonHTMLAttributes<HTMLButtonElement>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, loading, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={classes({ variant, size, block, children })}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="spinner" aria-hidden />}
      {children}
    </button>
  )
})

interface LinkButtonProps extends Common {
  to?: string
  href?: string
}

export function LinkButton({
  variant,
  size,
  block,
  children,
  to,
  href,
}: LinkButtonProps) {
  const cls = classes({ variant, size, block, children })
  if (href) {
    return (
      <a className={cls} href={href} target="_blank" rel="noreferrer noopener">
        {children}
      </a>
    )
  }
  return (
    <Link className={cls} to={to ?? '#'}>
      {children}
    </Link>
  )
}
