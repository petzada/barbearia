import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  as?: ElementType
  title?: ReactNode
  /** Ação ou badge no canto do título. */
  aside?: ReactNode
}

export function Card({
  as: Tag = 'section',
  title,
  aside,
  className,
  children,
  ...resto
}: CardProps) {
  return (
    <Tag
      {...resto}
      className={cn('rounded-lg border border-borda bg-superficie p-4 shadow-card', className)}
    >
      {title || aside ? (
        <div className="mb-3 flex items-start justify-between gap-3">
          {title ? <h2 className="text-lg font-semibold text-texto">{title}</h2> : <span />}
          {aside}
        </div>
      ) : null}
      {children}
    </Tag>
  )
}
