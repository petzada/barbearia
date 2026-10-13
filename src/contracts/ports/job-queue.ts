import type { Tx } from '~/platform/db/types'

export interface JobRequest<TPayload = unknown> {
  readonly queue: string
  readonly payload: TPayload
  /** Dedupe: no máximo um job ativo por (fila, chave). */
  readonly singletonKey?: string
  /** Executar a partir deste instante (lembretes, prazos). */
  readonly startAfter?: Date
  readonly correlationId?: string
}

export interface EnqueueResult {
  /** `null` quando a chave singleton já existia (job deduplicado). */
  readonly jobId: string | null
}

/** Implementação real (pg-boss ou outbox + dispatcher) é de T03; aqui só o contrato e um fake. */
export interface JobQueue {
  /** Enfileira na mesma transação do dado: rollback não deixa job (PRD §7.5). */
  enqueueInTx<TPayload>(tx: Tx, job: JobRequest<TPayload>): Promise<EnqueueResult>
  enqueue<TPayload>(job: JobRequest<TPayload>): Promise<EnqueueResult>
  cancelByKey(input: { queue: string; singletonKey: string }): Promise<void>
}
