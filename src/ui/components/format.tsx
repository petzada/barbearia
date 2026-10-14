import { formatBRL, money } from '~/platform/money'
import { useBrand } from '../brand/BrandProvider'
import { formatarData } from './format-data'
import type { FormatoData } from './format-data'

/**
 * Único ponto de formatação de dinheiro na UI (PRD §4.1). Recebe centavos prontos do servidor e nunca
 * calcula preço, cobertura ou prazo.
 */
export function MoneyText({ cents, className }: { cents: number; className?: string }) {
  return (
    <span className={className ? `tabular-nums ${className}` : 'tabular-nums'}>
      {formatBRL(money(cents))}
    </span>
  )
}

interface DateTimeTextProps {
  /** Instante ISO 8601 (como vem do servidor) ou Date. */
  value: string | Date
  /**
   * `completo` (dia da semana, dia, mês e hora) é o formato dos eventos críticos: prazos, cobranças e
   * fim de ciclo (PRD §4.1). Os outros servem a listas e rótulos.
   */
  format?: FormatoData
  /** Fuso IANA; o padrão é o da loja (BrandConfig.fuso). */
  timeZone?: string
  className?: string
}

/** Único ponto de formatação de data e hora na UI; sempre no fuso da loja, nunca no do aparelho. */
export function DateTimeText({
  value,
  format = 'completo',
  timeZone,
  className,
}: DateTimeTextProps) {
  const marca = useBrand()
  const instante = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(instante.getTime())) {
    return <span className={className}>Data indisponível</span>
  }
  return (
    <time dateTime={instante.toISOString()} className={className}>
      {formatarData(instante, format, timeZone ?? marca.fuso)}
    </time>
  )
}
