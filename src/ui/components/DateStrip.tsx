import { formatarDiaLocal } from './format-data'
import { cn } from './cn'
import { moverFocoComSetas } from './roving'

export interface DateStripDay {
  /** Dia local da loja (`2026-10-17`), escolhido pelo servidor. */
  date: string
  /** Sem horário livre (ou fechado): decidido pelo servidor, a tela só mostra. */
  disabled?: boolean
}

interface DateStripProps {
  label: string
  days: readonly DateStripDay[]
  selected: string | null
  onSelect: (date: string) => void
}

/**
 * Faixa horizontal de dias. Mostra os dias que recebeu; não calcula disponibilidade nem feriado.
 * Um item por vez entra na ordem de tabulação (roving), e as setas movem entre os dias.
 */
export function DateStrip({ label, days, selected, onSelect }: DateStripProps) {
  const primeiroHabilitado = days.find((d) => !d.disabled)?.date
  const foco = selected ?? primeiroHabilitado
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={moverFocoComSetas}
      className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 py-1"
    >
      {days.map((dia) => {
        const ativo = dia.date === selected
        const semana = formatarDiaLocal(dia.date, { weekday: 'short' }) ?? ''
        const numero = formatarDiaLocal(dia.date, { day: 'numeric' }) ?? ''
        const mes = formatarDiaLocal(dia.date, { month: 'short' }) ?? ''
        const nomeCompleto =
          formatarDiaLocal(dia.date, { weekday: 'long', day: 'numeric', month: 'long' }) ?? dia.date
        return (
          <button
            key={dia.date}
            type="button"
            role="radio"
            aria-checked={ativo}
            aria-disabled={dia.disabled || undefined}
            aria-label={dia.disabled ? `${nomeCompleto}, indisponível` : nomeCompleto}
            tabIndex={dia.date === foco ? 0 : -1}
            onClick={() => {
              if (!dia.disabled) onSelect(dia.date)
            }}
            className={cn(
              'flex min-h-16 min-w-14 shrink-0 snap-start flex-col items-center justify-center rounded-md border px-2 py-1.5 text-center',
              ativo
                ? 'border-transparent bg-primaria text-sobre-primaria'
                : 'border-borda-forte bg-superficie text-texto',
              dia.disabled && 'cursor-not-allowed opacity-50 line-through',
            )}
          >
            <span className="text-xs uppercase">{semana.replace('.', '')}</span>
            <span className="text-xl font-semibold tabular-nums">{numero}</span>
            <span className="text-xs">{mes.replace('.', '')}</span>
          </button>
        )
      })}
    </div>
  )
}
