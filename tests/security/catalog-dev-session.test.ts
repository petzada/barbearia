import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ResolvedSession, SessionResolver } from '../../src/contracts/session'
import { createDevSessionResolver } from '../../src/modules/catalog/dev-session.server'

const sessionReal: ResolvedSession = {
  actorId: 'real-admin',
  roles: ['admin'],
  sessionId: 'real-session',
  authTime: new Date('2027-01-31T14:00:00Z'),
}

const nenhum: SessionResolver = { resolve: async () => null }

describe('sessão falsa isolada de E2E', () => {
  it('exige modo development e E2E_FAKE_SESSION habilitado', async () => {
    const request = new Request('http://localhost/admin', {
      headers: { cookie: 'dev_sessao=admin' },
    })
    const ativa = createDevSessionResolver(nenhum, { mode: 'development', enabled: true })
    const producao = createDevSessionResolver(nenhum, { mode: 'production', enabled: true })
    const semFlag = createDevSessionResolver(nenhum, { mode: 'development', enabled: false })
    const fake = await ativa.resolve(request)

    expect(fake?.roles).toEqual(['admin'])
    expect(fake && 'marker' in fake ? fake.marker : null).toBe(
      'catalog-dev-session-server-only-marker',
    )
    expect(await producao.resolve(request)).toBeNull()
    expect(await semFlag.resolve(request)).toBeNull()
  })

  it('preserva uma sessão real antes de considerar o cookie de teste', async () => {
    const real: SessionResolver = { resolve: async () => sessionReal }
    const resolver = createDevSessionResolver(real, { mode: 'development', enabled: true })
    const request = new Request('http://localhost/admin', {
      headers: { cookie: 'dev_sessao=barbeiro' },
    })
    expect(await resolver.resolve(request)).toBe(sessionReal)
  })

  it.skipIf(!existsSync(resolve(process.cwd(), 'dist/client')))(
    'não inclui o marcador do resolvedor server-only no bundle do navegador',
    () => {
      const clientDir = resolve(process.cwd(), 'dist/client')
      const arquivos: string[] = []
      function listar(dir: string) {
        for (const item of readdirSync(dir, { withFileTypes: true })) {
          const caminho = join(dir, item.name)
          if (item.isDirectory()) listar(caminho)
          else arquivos.push(caminho)
        }
      }
      listar(clientDir)
      const bundles = arquivos
        .filter((arquivo) => /\.(?:js|mjs)$/.test(arquivo))
        .map((arquivo) => readFileSync(arquivo, 'utf8'))
        .join('\n')
      expect(bundles).not.toContain('catalog-dev-session-server-only-marker')
      expect(bundles).not.toContain('E2E_FAKE_SESSION')
    },
  )
})
