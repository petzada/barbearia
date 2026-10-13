import type { Clock } from '~/contracts/clock'
import type { ActorKind, RequestContext } from '~/contracts/context'
import type { ResolvedSession } from '~/contracts/session'
import { newId } from '../ids'

export interface CreateContextInput {
  /** Do deploy (D0019): nunca de entrada do navegador. */
  readonly barbeariaId: string
  readonly clock: Clock
  readonly correlationId?: string
  readonly session?: ResolvedSession | null
}

const PADRAO_CORRELATION_ID = /^[A-Za-z0-9_-]{8,64}$/

export function newCorrelationId(): string {
  return newId()
}

/** Aceita o `x-correlation-id` da entrada só se tiver formato seguro (vai para logs e auditoria). */
export function correlationIdFromHeader(value: string | null | undefined): string {
  return value && PADRAO_CORRELATION_ID.test(value) ? value : newCorrelationId()
}

function buildContext(input: CreateContextInput, actorKind: ActorKind): RequestContext {
  const session = actorKind === 'user' ? (input.session ?? null) : null
  return {
    barbeariaId: input.barbeariaId,
    actorKind,
    actorId: session?.actorId ?? null,
    roles: session ? [...new Set(session.roles)] : [],
    sessionId: session?.sessionId ?? null,
    authTime: session?.authTime ?? null,
    correlationId: input.correlationId ?? newCorrelationId(),
    clock: input.clock,
  }
}

export function createRequestContext(input: CreateContextInput): RequestContext {
  return buildContext(input, input.session ? 'user' : 'anonymous')
}

/** Jobs e processos internos: sem ator, sem sessão, sem papéis. A auditoria registra `ator_id` nulo. */
export function createSystemContext(input: Omit<CreateContextInput, 'session'>): RequestContext {
  return buildContext(input, 'system')
}
