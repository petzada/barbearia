import type { Role } from '~/contracts'
import { isStaff } from './tabs'

export type Area = 'app' | 'equipe' | 'admin'

export interface AccessSession {
  readonly roles: readonly Role[]
}

export type AccessDecision =
  | { readonly kind: 'allow' }
  /** Sem sessão: vai ao login preservando o destino. */
  | { readonly kind: 'login' }
  /** Logado, mas no contexto errado (cliente em /equipe e vice-versa): leva ao contexto certo. */
  | { readonly kind: 'redirect'; readonly to: string }
  | { readonly kind: 'denied' }

/**
 * Guarda de rota **só de experiência** (PRD §4.2): decide para onde mandar a pessoa. Quem ignorar a
 * guarda continua barrado no servidor, que exige papel, vínculo e sessão em cada operação.
 */
export function decideAccess(area: Area, session: AccessSession | null): AccessDecision {
  if (!session) return { kind: 'login' }
  const { roles } = session
  switch (area) {
    case 'app':
      if (roles.includes('cliente')) return { kind: 'allow' }
      return isStaff(roles) ? { kind: 'redirect', to: '/equipe' } : { kind: 'denied' }
    case 'equipe':
      if (isStaff(roles)) return { kind: 'allow' }
      return roles.includes('cliente') ? { kind: 'redirect', to: '/app' } : { kind: 'denied' }
    case 'admin':
      return roles.includes('admin') ? { kind: 'allow' } : { kind: 'denied' }
  }
}

/** Para onde a pessoa vai ao abrir o app logada (D0047). Equipe primeiro; cliente se for só cliente. */
export function homeOf(session: AccessSession | null): string {
  if (!session) return '/'
  if (isStaff(session.roles)) return '/equipe'
  return session.roles.includes('cliente') ? '/app' : '/'
}

/**
 * Aceita só caminho interno (`/app/plano?x=1`). Protege o `destino` do login contra redirecionamento
 * para outro site (`//evil.com`, `/\evil.com`, `https://...`) e contra caracteres de controle.
 */
export function safeDestination(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) return null
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return null
  return raw
}

/** Endereço do login que volta ao destino depois de entrar (PRD §4.1, deep links). */
export function loginHref(destino: string): string {
  const seguro = safeDestination(destino)
  return seguro ? `/entrar?destino=${encodeURIComponent(seguro)}` : '/entrar'
}
