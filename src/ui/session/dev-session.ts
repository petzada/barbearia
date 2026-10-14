import { ROLES, type Role } from '~/contracts'
import type { UiSession } from './ui-session'

/** Nome do cookie de sessão de teste (só lido em desenvolvimento, ver `ui-session.ts`). */
export const DEV_SESSION_COOKIE = 'dev_sessao'

/**
 * Lê `dev_sessao=cliente,barbeiro` do cookie do navegador. Existe só para os testes de interface antes
 * do login real (T04); não autentica nada no servidor, que continua sem sessão.
 */
export function devSessionFromCookie(cookie?: string): UiSession | null {
  const texto = cookie ?? (typeof document === 'undefined' ? '' : document.cookie)
  const par = texto.split(';').find((p) => p.trim().startsWith(`${DEV_SESSION_COOKIE}=`))
  if (!par) return null
  const valor = decodeURIComponent(par.trim().slice(DEV_SESSION_COOKIE.length + 1))
  const roles = valor.split(',').filter((r): r is Role => (ROLES as readonly string[]).includes(r))
  if (roles.length === 0) return null
  return { actorId: `dev-${roles.join('-')}`, nome: 'Pessoa de teste', roles }
}
