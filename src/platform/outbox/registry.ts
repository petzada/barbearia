import type { RequestContext } from '~/contracts/context'
import type { DomainEvent } from '~/contracts/events'
import type { Tx } from '../db/types'

export interface EventDelivery {
  /** Transação do dispatcher: o efeito do handler no banco confirma junto com o registro da entrega. */
  readonly tx: Tx
  readonly ctx: RequestContext
}

export interface EventHandlerDefinition<TEvent extends DomainEvent = DomainEvent> {
  /** Nome único e estável (`modulo.handler`): é a metade da chave de idempotência `(handler, eventId)`. */
  readonly name: string
  /** Tipo do evento (`ReservationConfirmed`). */
  readonly eventType: string
  /**
   * Roda uma vez por `(handler, evento)`. Só efeito no banco aqui dentro; efeito externo vira job
   * (`enqueueInTx`) ou `runExternalOperation`. Lançar desfaz o efeito e o evento é retentado.
   */
  readonly handle: (event: TEvent, delivery: EventDelivery) => Promise<void>
}

const NOME_VALIDO = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/
const handlers = new Map<string, EventHandlerDefinition>()

/** Cada módulo registra os seus em `modules/<m>/jobs.ts` (importado pelo worker). */
export function registerEventHandler<TEvent extends DomainEvent>(
  definicao: EventHandlerDefinition<TEvent>,
): void {
  if (!NOME_VALIDO.test(definicao.name)) {
    throw new Error(`Nome de handler inválido: "${definicao.name}" (ex.: "agenda.avisar-reserva").`)
  }
  if (handlers.has(definicao.name)) {
    throw new Error(`Já existe handler de evento com o nome "${definicao.name}".`)
  }
  handlers.set(definicao.name, definicao as unknown as EventHandlerDefinition)
}

export function listEventHandlers(eventType: string): readonly EventHandlerDefinition[] {
  return [...handlers.values()].filter((h) => h.eventType === eventType)
}

/** Só para testes. */
export function resetEventHandlers(): void {
  handlers.clear()
}
