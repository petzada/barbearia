/**
 * Envelope de evento de domínio (PRD §7.3). Publicado pelo outbox na mesma transação do dado (T03).
 * Cada módulo declara seus eventos em `events.ts` com `defineEvent` (`~/platform/context`).
 */
export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  readonly id: string
  readonly type: TType
  /** Versão do formato do payload; incrementa quando o payload muda de forma incompatível. */
  readonly version: number
  readonly barbeariaId: string
  readonly aggregateId: string
  readonly aggregateRevision: number
  readonly occurredAt: Date
  readonly correlationId: string
  readonly payload: TPayload
}
