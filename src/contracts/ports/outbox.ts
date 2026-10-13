import type { Tx } from '~/platform/db/types'
import type { DomainEvent } from '../events'

/** Eventos de domínio saem na mesma transação do dado; o dispatcher (T03) entrega com idempotência. */
export interface Outbox {
  publishInTx(tx: Tx, event: DomainEvent): Promise<void>
}
