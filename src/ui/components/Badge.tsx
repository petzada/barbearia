import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import { cn } from './cn'

export type Tone = 'neutro' | 'sucesso' | 'alerta' | 'perigo' | 'info'

// Cada tom tem um ícone próprio: o estado nunca depende só da cor (PRD §4.1).
export const ICONE_DO_TOM: Record<Tone, IconName> = {
  neutro: 'info',
  sucesso: 'check',
  alerta: 'alerta',
  perigo: 'erro',
  info: 'info',
}

/** Etiqueta de estado. O texto vem pronto (ex.: "Pagamento pendente"); a tela escolhe o tom. */
export function Badge({
  tone = 'neutro',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      data-tom={tone}
      className={cn(
        'inline-flex min-h-6 items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-semibold',
        'border-[color-mix(in_oklab,var(--tom)_55%,transparent)] bg-[color-mix(in_oklab,var(--tom)_16%,var(--color-superficie))] text-[var(--tom)]',
        className,
      )}
    >
      <Icon name={ICONE_DO_TOM[tone]} size={14} />
      {children}
    </span>
  )
}
