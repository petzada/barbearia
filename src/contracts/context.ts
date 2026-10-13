import type { Clock } from './clock'

export const ROLES = ['cliente', 'barbeiro', 'admin'] as const
export type Role = (typeof ROLES)[number]

export type ActorKind = 'user' | 'anonymous' | 'system'

/**
 * Contexto de toda operação (PRD §7.3). D0019: `barbeariaId` vem da configuração do deploy,
 * nunca do navegador. Papéis são combináveis (`['barbeiro', 'cliente']`).
 * Jobs e processos internos usam contexto de sistema: `actorId`, `sessionId` e `authTime` nulos.
 */
export interface RequestContext {
  readonly barbeariaId: string
  /** `user`: sessão; `anonymous`: visitante; `system`: job/processo interno. Separa o escopo de idempotência. */
  readonly actorKind: ActorKind
  readonly actorId: string | null
  readonly roles: readonly Role[]
  readonly sessionId: string | null
  readonly authTime: Date | null
  readonly correlationId: string
  readonly clock: Clock
}

/** Contexto de uma operação que exigiu sessão: ator, sessão e instante do login são conhecidos. */
export interface AuthenticatedContext extends RequestContext {
  readonly actorId: string
  readonly sessionId: string
  readonly authTime: Date
}
