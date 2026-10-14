import { ROLES, type Role } from '~/contracts'
import type { ResolvedSession, SessionResolver } from '~/contracts/session'
import { getSessionResolver, setSessionResolver } from '~/platform/context/session-resolver'
import { systemClock } from '~/platform/time'

const MARCADOR_SERVER_ONLY = 'catalog-dev-session-server-only-marker'
const COOKIE_DE_TESTE = 'dev_sessao'

function cookieValue(request: Request): string | null {
  const cookie = request.headers.get('cookie') ?? ''
  const item = cookie
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${COOKIE_DE_TESTE}=`))
  if (!item) return null
  try {
    return decodeURIComponent(item.slice(COOKIE_DE_TESTE.length + 1))
  } catch {
    return null
  }
}

function rolesFromRequest(request: Request): Role[] {
  const allowed = new Set<string>(ROLES)
  return [
    ...new Set(
      (cookieValue(request) ?? '').split(',').filter((role): role is Role => allowed.has(role)),
    ),
  ]
}

/** O wrapper sempre delega primeiro: uma sessão real continua sendo a autoridade do processo. */
export function createDevSessionResolver(
  realResolver: SessionResolver,
  options: { readonly mode: string; readonly enabled: boolean },
): SessionResolver {
  return {
    async resolve(request): Promise<ResolvedSession | null> {
      const realSession = await realResolver.resolve(request)
      if (realSession) return realSession
      if (options.mode !== 'development' || !options.enabled) return null
      const roles = rolesFromRequest(request)
      if (roles.length === 0) return null
      const nomeFake = roles.join('-')
      const fakeSession: ResolvedSession & { readonly marker: string } = {
        actorId: `e2e-${nomeFake}`,
        roles,
        sessionId: `e2e-${nomeFake}`,
        authTime: systemClock.now(),
        marker: MARCADOR_SERVER_ONLY,
      }
      return fakeSession
    },
  }
}

// Sinal de teste fica neste módulo exclusivo do servidor; nunca substitui a resposta de T04.
if (import.meta.env.MODE === 'development' && process.env['E2E_FAKE_SESSION'] === '1') {
  setSessionResolver(
    createDevSessionResolver(getSessionResolver(), {
      mode: import.meta.env.MODE,
      enabled: process.env['E2E_FAKE_SESSION'] === '1',
    }),
  )
}
