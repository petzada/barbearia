import type { AuthenticatedContext, RequestContext, Role } from '~/contracts/context'
import { AuthErrors } from '../errors/generic'

/** D0071 / D0081: janela padrão de autenticação recente para ações sensíveis do admin (configurável por barbearia em T08). */
export const DEFAULT_RECENT_AUTH_WINDOW_MS = 60 * 60 * 1000

export function isAuthenticated(ctx: RequestContext): ctx is AuthenticatedContext {
  return ctx.actorId !== null && ctx.sessionId !== null && ctx.authTime !== null
}

/** Exige sessão; sem ela, `AUTH.REQUIRED` (401). */
export function requireAuthenticated(ctx: RequestContext): asserts ctx is AuthenticatedContext {
  if (!isAuthenticated(ctx)) throw AuthErrors.REQUIRED()
}

export function hasAnyRole(ctx: RequestContext, roles: readonly Role[]): boolean {
  return roles.some((papel) => ctx.roles.includes(papel))
}

/** Exige pelo menos um dos papéis; sem sessão `AUTH.REQUIRED`, sem papel `AUTH.FORBIDDEN`. */
export function requireRole(
  ctx: RequestContext,
  ...roles: [Role, ...Role[]]
): asserts ctx is AuthenticatedContext {
  requireAuthenticated(ctx)
  if (!hasAnyRole(ctx, roles)) throw AuthErrors.FORBIDDEN()
}

export interface OwnershipOptions {
  /** Papéis que também podem agir sobre recurso de outra pessoa (ex.: `['admin']`). */
  readonly orRoles?: readonly Role[]
}

/**
 * Exige que o recurso seja do próprio ator (ou que ele tenha um dos papéis de `orRoles`).
 * Cliente com ID alheio recebe `AUTH.FORBIDDEN` (PRD §8.2, família Acesso).
 */
export function requireOwnership(
  ctx: RequestContext,
  resourceOwnerId: string,
  options: OwnershipOptions = {},
): asserts ctx is AuthenticatedContext {
  requireAuthenticated(ctx)
  if (ctx.actorId === resourceOwnerId) return
  if (options.orRoles && hasAnyRole(ctx, options.orRoles)) return
  throw AuthErrors.FORBIDDEN()
}

export interface RecentAuthOptions {
  readonly windowMs?: number
}

/**
 * D0071: ação sensível exige login recente. A janela é semiaberta: com exatamente `windowMs`
 * decorridos o login já está vencido (`AUTH.RECENT_REQUIRED`).
 */
export function requireRecentAuth(
  ctx: RequestContext,
  options: RecentAuthOptions = {},
): asserts ctx is AuthenticatedContext {
  requireAuthenticated(ctx)
  const janela = options.windowMs ?? DEFAULT_RECENT_AUTH_WINDOW_MS
  const decorrido = ctx.clock.now().getTime() - ctx.authTime.getTime()
  if (decorrido >= janela) throw AuthErrors.RECENT_REQUIRED()
}
