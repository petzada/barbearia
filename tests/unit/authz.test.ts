import { describe, expect, it } from 'vitest'
import type { Role } from '~/contracts'
import {
  DEFAULT_RECENT_AUTH_WINDOW_MS,
  isPolicy,
  policies,
  requireAuthenticated,
  requireOwnership,
  requireRecentAuth,
  requireRole,
} from '~/platform/authz'
import { createRequestContext } from '~/platform/context/request-context'
import { AppError } from '~/platform/errors'
import { createManualClock } from '~/platform/time'

const relogio = createManualClock('2027-01-31T15:00:00Z')

function contexto(opcoes: { atorId?: string; roles?: Role[]; authTime?: Date } = {}) {
  return createRequestContext({
    barbeariaId: 'b1',
    clock: relogio,
    session: opcoes.atorId
      ? {
          actorId: opcoes.atorId,
          roles: opcoes.roles ?? ['cliente'],
          sessionId: 's1',
          authTime: opcoes.authTime ?? relogio.now(),
        }
      : null,
  })
}

function codigoDe(fn: () => unknown): string | undefined {
  try {
    fn()
  } catch (erro) {
    return erro instanceof AppError ? erro.code : `outro:${String(erro)}`
  }
  return undefined
}

describe('papéis combináveis', () => {
  it('anônimo recebe AUTH.REQUIRED; sem o papel, AUTH.FORBIDDEN; com qualquer um dos papéis, passa', () => {
    expect(codigoDe(() => requireRole(contexto(), 'admin'))).toBe('AUTH.REQUIRED')
    expect(codigoDe(() => requireRole(contexto({ atorId: 'u1' }), 'admin'))).toBe('AUTH.FORBIDDEN')
    expect(
      codigoDe(() =>
        requireRole(contexto({ atorId: 'u1', roles: ['barbeiro'] }), 'admin', 'barbeiro'),
      ),
    ).toBeUndefined()
  })

  it('uma pessoa pode ser barbeiro e cliente ao mesmo tempo', () => {
    const ctx = contexto({ atorId: 'u1', roles: ['barbeiro', 'cliente', 'barbeiro'] })
    expect(ctx.roles).toEqual(['barbeiro', 'cliente'])
    expect(codigoDe(() => requireRole(ctx, 'cliente'))).toBeUndefined()
    expect(codigoDe(() => requireRole(ctx, 'barbeiro'))).toBeUndefined()
    expect(codigoDe(() => requireRole(ctx, 'admin'))).toBe('AUTH.FORBIDDEN')
  })

  it('requireAuthenticated exige sessão', () => {
    expect(codigoDe(() => requireAuthenticated(contexto()))).toBe('AUTH.REQUIRED')
    expect(codigoDe(() => requireAuthenticated(contexto({ atorId: 'u1' })))).toBeUndefined()
  })
})

describe('requireOwnership', () => {
  it('cliente com ID alheio recebe AUTH.FORBIDDEN', () => {
    expect(codigoDe(() => requireOwnership(contexto({ atorId: 'u1' }), 'u2'))).toBe(
      'AUTH.FORBIDDEN',
    )
  })

  it('o dono passa; admin passa quando autorizado por orRoles', () => {
    expect(codigoDe(() => requireOwnership(contexto({ atorId: 'u1' }), 'u1'))).toBeUndefined()
    const admin = contexto({ atorId: 'a1', roles: ['admin'] })
    expect(codigoDe(() => requireOwnership(admin, 'u1'))).toBe('AUTH.FORBIDDEN')
    expect(codigoDe(() => requireOwnership(admin, 'u1', { orRoles: ['admin'] }))).toBeUndefined()
  })

  it('anônimo recebe AUTH.REQUIRED', () => {
    expect(codigoDe(() => requireOwnership(contexto(), 'u1'))).toBe('AUTH.REQUIRED')
  })
})

// D0071 / D0081: 1 hora por padrão; janela semiaberta.
describe('requireRecentAuth', () => {
  const umaHora = DEFAULT_RECENT_AUTH_WINDOW_MS

  it('a janela padrão é de 1 hora', () => {
    expect(umaHora).toBe(3_600_000)
  })

  it('login há 59 min 59 s é recente; a partir de 1 h exata, vencido', () => {
    const authTime = relogio.now()
    const ctx = contexto({ atorId: 'a1', roles: ['admin'], authTime })
    relogio.set(new Date(authTime.getTime() + umaHora - 1000))
    expect(codigoDe(() => requireRecentAuth(ctx))).toBeUndefined()
    relogio.set(new Date(authTime.getTime() + umaHora))
    expect(codigoDe(() => requireRecentAuth(ctx))).toBe('AUTH.RECENT_REQUIRED')
    relogio.set('2027-01-31T15:00:00Z')
  })

  it('a janela é configurável por chamada', () => {
    const authTime = new Date(relogio.now().getTime() - 10 * 60_000)
    const ctx = contexto({ atorId: 'a1', roles: ['admin'], authTime })
    expect(codigoDe(() => requireRecentAuth(ctx, { windowMs: 5 * 60_000 }))).toBe(
      'AUTH.RECENT_REQUIRED',
    )
    expect(codigoDe(() => requireRecentAuth(ctx, { windowMs: 15 * 60_000 }))).toBeUndefined()
  })

  it('sem sessão recebe AUTH.REQUIRED', () => {
    expect(codigoDe(() => requireRecentAuth(contexto()))).toBe('AUTH.REQUIRED')
  })
})

describe('política', () => {
  it('construtores e validação em tempo de execução', () => {
    expect(isPolicy(policies.public())).toBe(true)
    expect(isPolicy(policies.authenticated())).toBe(true)
    expect(isPolicy(policies.anyRole('admin', 'barbeiro'))).toBe(true)
    expect(isPolicy(undefined)).toBe(false)
    expect(isPolicy({ kind: 'qualquer' })).toBe(false)
    expect(isPolicy({ kind: 'roles', roles: [] })).toBe(false)
  })
})
