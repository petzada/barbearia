/**
 * Único relógio permitido no domínio (PRD §7.3). `Date.now()` e `new Date()` sem argumento só existem
 * em `src/platform/time`. Implementações: `systemClock` e `createManualClock` (testes).
 */
export interface Clock {
  now(): Date
}
