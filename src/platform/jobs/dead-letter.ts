import { logger } from '../logging'

export type DeadLetterSource = 'job' | 'outbox' | 'inbox' | 'external-op'
/** `permanent`: erro de configuração/dados; `exhausted`: retentativas acabaram; `expired`: o pg-boss desistiu (crash/expiração). */
export type DeadLetterReason = 'permanent' | 'exhausted' | 'expired'

export interface DeadLetterEvent {
  readonly source: DeadLetterSource
  readonly reason: DeadLetterReason
  /** Id do job, do evento do outbox, do registro do inbox ou da operação externa. */
  readonly ref: string
  readonly queue?: string
  /** Texto já seguro (ver `describeError`). */
  readonly error: string
  readonly correlationId?: string
}

/**
 * Gancho de pendência: T03 só define a interface; T30 troca o padrão (log) pela criação da pendência
 * real para o admin. Chamado depois do commit; deve ser idempotente (pode repetir após falha).
 */
export type DeadLetterHook = (event: DeadLetterEvent) => Promise<void>

const hookPadrao: DeadLetterHook = (evento) => {
  logger.error(
    evento,
    'pendência: falha sem recuperação automática (hook padrão só registra em log)',
  )
  return Promise.resolve()
}

let atual: DeadLetterHook = hookPadrao

export function setDeadLetterHook(hook: DeadLetterHook | undefined): void {
  atual = hook ?? hookPadrao
}

export function reportDeadLetter(evento: DeadLetterEvent): Promise<void> {
  return atual(evento)
}
