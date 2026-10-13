import type { DomainEvent } from '../events'
import type { Outbox } from '../ports/outbox'

/** Fake em memória: guarda os eventos publicados na ordem. Não simula rollback de transação. */
export class FakeOutbox implements Outbox {
  readonly events: DomainEvent[] = []

  publishInTx(_tx: unknown, event: DomainEvent): Promise<void> {
    this.events.push(event)
    return Promise.resolve()
  }
}
