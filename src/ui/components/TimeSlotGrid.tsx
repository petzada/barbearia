import { useBrand } from '../brand/BrandProvider'
import { formatarData } from './format-data'
import { cn } from './cn'
import { moverFocoComSetas } from './roving'

export interface TimeSlot {
  id: string
  /** Início do horário (ISO 8601); a tela o mostra no fuso da loja. */
  startsAt: string
  /** Já decidido pelo servidor: a grade não calcula ocupação (PRD §4.1: disponibilidade é proposta). */
  available: boolean
}

interface TimeSlotGridProps {
  label: string
  slots: readonly TimeSlot[]
  selectedId: string | null
  onSelect: (slotId: string) => void
  timeZone?: string
}

export function TimeSlotGrid({ label, slots, selectedId, onSelect, timeZone }: TimeSlotGridProps) {
  const marca = useBrand()
  const fuso = timeZone ?? marca.fuso
  const primeiroLivre = slots.find((s) => s.available)?.id
  const foco = selectedId ?? primeiroLivre
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={moverFocoComSetas}
      className="grid grid-cols-3 gap-2 sm:grid-cols-4"
    >
      {slots.map((slot) => {
        const ativo = slot.id === selectedId
        const hora = formatarData(new Date(slot.startsAt), 'hora', fuso)
        return (
          <button
            key={slot.id}
            type="button"
            role="radio"
            aria-checked={ativo}
            aria-disabled={!slot.available || undefined}
            aria-label={slot.available ? hora : `${hora}, indisponível`}
            tabIndex={slot.id === foco ? 0 : -1}
            onClick={() => {
              if (slot.available) onSelect(slot.id)
            }}
            className={cn(
              'min-h-11 rounded-md border px-2 py-2 text-base font-semibold tabular-nums',
              ativo
                ? 'border-transparent bg-primaria text-sobre-primaria'
                : 'border-borda-forte bg-superficie text-texto',
              !slot.available && 'cursor-not-allowed opacity-50 line-through',
            )}
          >
            {hora}
          </button>
        )
      })}
    </div>
  )
}
