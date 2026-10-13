import type { Role } from '~/contracts/context'

export interface PublicPolicy {
  readonly kind: 'public'
}
/** Qualquer pessoa autenticada, sem exigir papel específico. */
export interface AuthenticatedPolicy {
  readonly kind: 'authenticated'
}
/** Autenticada e com pelo menos um dos papéis (papéis são combináveis). */
export interface RolesPolicy {
  readonly kind: 'roles'
  readonly roles: readonly [Role, ...Role[]]
}

/**
 * Política de autorização, obrigatória em toda operação (PRD §7.3). Não existe "sem política":
 * o tipo não deixa omitir e o construtor recusa valor desconhecido em tempo de execução.
 */
export type Policy = PublicPolicy | AuthenticatedPolicy | RolesPolicy

export const policies = {
  /** Só com nome na allowlist (`public-allowlist.ts`). */
  public: (): PublicPolicy => ({ kind: 'public' }),
  authenticated: (): AuthenticatedPolicy => ({ kind: 'authenticated' }),
  anyRole: (...roles: [Role, ...Role[]]): RolesPolicy => ({ kind: 'roles', roles }),
} as const

export function isPolicy(value: unknown): value is Policy {
  if (typeof value !== 'object' || value === null) return false
  const kind = (value as { kind?: unknown }).kind
  if (kind === 'public' || kind === 'authenticated') return true
  if (kind !== 'roles') return false
  const roles = (value as { roles?: unknown }).roles
  return Array.isArray(roles) && roles.length > 0
}
