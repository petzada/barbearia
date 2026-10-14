import type { DomainEvent } from '~/contracts/events'
import type { Outbox } from '~/contracts/ports/outbox'
import type { Tx } from '../db/types'
import { outbox } from './schema'

/**
 * Implementação do port `Outbox`: grava o evento na MESMA transação do dado (PRD §7.5). Rollback não deixa
 * evento. Publicar o mesmo evento (mesmo `id`) duas vezes é inofensivo.
 */
export const drizzleOutbox: Outbox = {
  async publishInTx(tx: Tx, event: DomainEvent): Promise<void> {
    await tx
      .insert(outbox)
      .values({
        id: event.id,
        barbeariaId: event.barbeariaId,
        tipo: event.type,
        versao: event.version,
        agregadoId: event.aggregateId,
        revisaoAgregado: event.aggregateRevision,
        ocorridoEm: event.occurredAt,
        correlationId: event.correlationId,
        payload: event.payload ?? null,
      })
      .onConflictDoNothing({ target: outbox.id })
  },
}
