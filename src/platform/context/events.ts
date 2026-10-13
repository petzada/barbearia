import type { RequestContext } from '~/contracts/context'
import type { DomainEvent } from '~/contracts/events'
import { newId } from '../ids'

export interface EventInit<TPayload> {
  readonly aggregateId: string
  readonly aggregateRevision: number
  readonly payload: TPayload
}

export interface EventDefinition<TType extends string, TPayload> {
  readonly type: TType
  readonly version: number
  create(ctx: RequestContext, init: EventInit<TPayload>): DomainEvent<TType, TPayload>
}

/**
 * Cada módulo declara os seus eventos em `events.ts` (PRD §7.3):
 *
 * ```ts
 * export const ReservationConfirmed = defineEvent<'ReservationConfirmed', { reservaId: string }>(
 *   'ReservationConfirmed', 1)
 * // dentro da transação: await outbox.publishInTx(tx, ReservationConfirmed.create(ctx, {...}))
 * ```
 * `version` sobe quando o payload muda de forma incompatível; consumidores aceitam versões que conhecem.
 */
export function defineEvent<TType extends string, TPayload>(
  type: TType,
  version: number,
): EventDefinition<TType, TPayload> {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(type)) throw new Error(`Nome de evento inválido: "${type}".`)
  if (!Number.isInteger(version) || version < 1)
    throw new Error('Versão de evento deve ser inteiro ≥ 1.')
  return {
    type,
    version,
    create: (ctx, init) => ({
      id: newId(ctx.clock),
      type,
      version,
      barbeariaId: ctx.barbeariaId,
      aggregateId: init.aggregateId,
      aggregateRevision: init.aggregateRevision,
      occurredAt: ctx.clock.now(),
      correlationId: ctx.correlationId,
      payload: init.payload,
    }),
  }
}
