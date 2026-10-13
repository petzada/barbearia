// O dispatcher é o único ponto de entrada do navegador (src/platform/context/dispatcher.ts). Aqui exercitamos
// o que ele faz no servidor — registro por nome, barbearia do deploy, sessão pelo resolvedor, correlationId —
// chamando `dispatchOperation` com uma `Request` real. A chamada HTTP completa (navegador → RPC) foi
// provada à mão em dev e em produção (relatório de T02).
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ok } from '../../src/contracts'
import { FakeSessionResolver } from '../../src/contracts/fakes'
import { policies } from '../../src/platform/authz'
import { defineQuery, resetSessionResolver, setSessionResolver } from '../../src/platform/context'
import { dispatchOperation } from '../../src/platform/context/dispatch.server'
import {
  barbearias,
  getDeployBarbearia,
  resetDeployBarbearia,
  seedBarbearia,
} from '../../src/platform/db'
import { loadEnv } from '../../src/platform/validation'
import { abrirBancoDeTeste, type BancoDeTeste } from './helpers/banco'

let banco: BancoDeTeste
const resolvedor = new FakeSessionResolver()

// Definir a operação já a registra no `defaultRegistry`, que é o que o dispatcher consulta.
defineQuery({
  name: 'teste.quemSou',
  input: z.object({ barbeariaId: z.string().optional() }),
  policy: policies.authenticated(),
  handler: ({ ctx }) =>
    Promise.resolve(ok({ ator: ctx.actorId, barbearia: ctx.barbeariaId, roles: [...ctx.roles] })),
})

function requisicao(cabecalhos: Record<string, string> = {}): Request {
  return new Request('http://app.test/_serverFn/x', { method: 'POST', headers: cabecalhos })
}

beforeAll(async () => {
  banco = await abrirBancoDeTeste()
  resetDeployBarbearia()
  await seedBarbearia(banco.db, { slug: loadEnv().BARBEARIA_SLUG, nome: 'Barbearia do deploy' })
})

beforeEach(() => {
  resolvedor.register('tok-ana', {
    actorId: 'ana',
    roles: ['cliente', 'barbeiro'],
    sessionId: 's-ana',
    authTime: banco.clock.now(),
  })
  setSessionResolver(resolvedor)
})

afterAll(async () => {
  resetSessionResolver()
  resetDeployBarbearia()
  await banco.db.delete(barbearias).where(eq(barbearias.slug, loadEnv().BARBEARIA_SLUG))
  await banco.encerrar()
})

describe('dispatchOperation', () => {
  it('operação desconhecida → SYSTEM.OPERATION_NOT_FOUND (404), sem vazar nada', async () => {
    const r = await dispatchOperation('modulo.naoExiste', {}, requisicao())
    expect(r).toMatchObject({
      status: 'error',
      code: 'SYSTEM.OPERATION_NOT_FOUND',
      httpStatus: 404,
    })
  })

  it('sem sessão → AUTH.REQUIRED (401): falha fechada', async () => {
    const r = await dispatchOperation('teste.quemSou', {}, requisicao())
    expect(r).toMatchObject({ status: 'error', code: 'AUTH.REQUIRED', httpStatus: 401 })
  })

  it('com sessão válida executa; a barbearia vem do deploy, nunca da entrada do navegador', async () => {
    const deploy = await getDeployBarbearia()
    const r = await dispatchOperation(
      'teste.quemSou',
      { barbeariaId: '00000000-0000-7000-8000-000000000000' },
      requisicao({ 'x-test-session': 'tok-ana' }),
    )
    expect(r).toEqual({
      status: 'ok',
      revision: null,
      data: { ator: 'ana', barbearia: deploy.id, roles: ['cliente', 'barbeiro'] },
    })
  })

  it('sessão revogada deixa de valer na hora', async () => {
    resolvedor.revoke('tok-ana')
    const r = await dispatchOperation(
      'teste.quemSou',
      {},
      requisicao({ 'x-test-session': 'tok-ana' }),
    )
    expect(r).toMatchObject({ status: 'error', code: 'AUTH.REQUIRED' })
  })

  it('usa o x-correlation-id seguro da entrada e descarta o inseguro', async () => {
    const seguro = await dispatchOperation(
      'teste.quemSou',
      {},
      requisicao({ 'x-correlation-id': 'req-abcdef-123' }),
    )
    expect(seguro).toMatchObject({ correlationId: 'req-abcdef-123' })
    const inseguro = await dispatchOperation(
      'teste.quemSou',
      {},
      requisicao({ 'x-correlation-id': 'x; drop table' }),
    )
    expect(inseguro).toMatchObject({ code: 'AUTH.REQUIRED' })
    expect(inseguro.status === 'error' && inseguro.correlationId).not.toBe('x; drop table')
  })
})
