import type { Clock } from '~/contracts/clock'

/** Relógio real. Único lugar (com `ids`) onde `Date.now()` é permitido. */
export const systemClock: Clock = {
  now: () => new Date(),
}

export interface ManualClock extends Clock {
  set(instant: Date | string): void
  advance(milliseconds: number): void
}

/** Relógio controlável para testes: nada de `sleep` como prova (PRD §8.1). */
export function createManualClock(start: Date | string): ManualClock {
  let atual = new Date(start)
  if (Number.isNaN(atual.getTime())) throw new RangeError('Instante inicial inválido.')
  return {
    now: () => new Date(atual.getTime()),
    set(instant) {
      atual = new Date(instant)
    },
    advance(milliseconds) {
      atual = new Date(atual.getTime() + milliseconds)
    },
  }
}
