import type { Role } from './context'

export interface ResolvedSession {
  readonly actorId: string
  readonly roles: readonly Role[]
  readonly sessionId: string
  /** Instante da última autenticação (login/OTP/Google), base do `requireRecentAuth` (D0071). */
  readonly authTime: Date
}

/**
 * Resolve a sessão a partir da requisição. T04 entrega a implementação real (cookie, revogação imediata
 * de papéis de equipe, D0071); T02 só a interface e uma implementação de testes (`contracts/fakes`).
 * Devolve `null` quando não há sessão válida. Nunca lança por sessão inválida.
 */
export interface SessionResolver {
  resolve(request: Request): Promise<ResolvedSession | null>
}
