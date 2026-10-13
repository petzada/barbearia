import { beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ok, type ResolvedSession } from '~/contracts'
import { FakeSessionResolver } from '~/contracts/fakes'
import { policies, requireOwnership } from '~/platform/authz'
import {
  OperationDefinitionError,
  OperationRegistry,
  createOperationFactory,
  type ExecutionEnvironment,
} from '~/platform/context'
import { setDatabase } from '~/platform/db'
import type { Db } from '~/platform/db'
import { createManualClock } from '~/platform/time'

const relogio = createManualClock('2027-01-31T15:00:00Z')
const registro = new OperationRegistry()
const { defineQuery, defineCommand } = createOperationFactory({
  publicAllowlist: ['catalog.listarServicos', 'catalog.listarCategorias'],
  registry: registro,
})

const resolvedor = new FakeSessionResolver()
const sessaoCliente: ResolvedSession = {
  actorId: 'cliente-1',
  roles: ['cliente'],
  sessionId: 's1',
  authTime: relogio.now(),
}

async function ambiente(token?: string): Promise<ExecutionEnvironment> {
  const request = new Request('http://app.test/', {
    headers: token ? { [FakeSessionResolver.HEADER]: token } : {},
  })
  return {
    barbeariaId: 'barbearia-1',
    clock: relogio,
    correlationId: 'corr-teste-1',
    session: await resolvedor.resolve(request),
  }
}

beforeEach(() => {
  resolvedor.register('cliente', sessaoCliente)
  resolvedor.register('admin', { ...sessaoCliente, actorId: 'admin-1', roles: ['admin'] })
  setDatabase({} as Db) // as consultas de teste não tocam o banco
  relogio.set('2027-01-31T15:00:00Z')
})

describe('construtores exigem schema, política e nome válido', () => {
  it('operação sem política falha ao ser definida', () => {
    expect(() =>
      defineQuery({
        name: 'teste.semPolitica',
        input: z.object({}),
        // @ts-expect-error: a política é obrigatória no tipo e no tempo de execução
        policy: undefined,
        handler: () => Promise.resolve(ok(null)),
      }),
    ).toThrow(OperationDefinitionError)
  })

  it('operação sem schema Zod falha ao ser definida', () => {
    expect(() =>
      defineQuery({
        name: 'teste.semSchema',
        // @ts-expect-error: o schema é obrigatório no tipo e no tempo de execução
        input: undefined,
        policy: policies.authenticated(),
        handler: () => Promise.resolve(ok(null)),
      }),
    ).toThrow(OperationDefinitionError)
  })

  it('nome fora de modulo.operacao falha', () => {
    for (const name of ['semPonto', 'Modulo.op', 'modulo.', 'a.b.c']) {
      expect(() =>
        defineQuery({
          name,
          input: z.object({}),
          policy: policies.authenticated(),
          handler: () => Promise.resolve(ok(null)),
        }),
      ).toThrow(OperationDefinitionError)
    }
  })

  it('rota pública fora da allowlist falha; dentro da allowlist passa', () => {
    expect(() =>
      defineQuery({
        name: 'catalog.listarBarbeiros',
        input: z.object({}),
        policy: policies.public(),
        handler: () => Promise.resolve(ok(null)),
      }),
    ).toThrow(/allowlist/)
    expect(() =>
      defineQuery({
        name: 'catalog.listarCategorias',
        input: z.object({}),
        policy: policies.public(),
        handler: () => Promise.resolve(ok(['corte'])),
      }),
    ).not.toThrow()
  })

  it('nome duplicado falha', () => {
    const def = {
      name: 'teste.duplicada',
      input: z.object({}),
      policy: policies.authenticated(),
      handler: () => Promise.resolve(ok(null)),
    }
    defineQuery(def)
    expect(() => defineQuery(def)).toThrow(/duplicada/)
  })

  it('a produção usa a allowlist real (vazia por ora): público não passa sem entrada', async () => {
    const { defineQuery: queryReal } = await import('~/platform/context')
    expect(() =>
      queryReal({
        name: 'teste.publicaSemAllowlist',
        input: z.object({}),
        policy: policies.public(),
        handler: () => Promise.resolve(ok(null)),
      }),
    ).toThrow(OperationDefinitionError)
  })
})

describe('pipeline de consulta', () => {
  const listar = defineQuery({
    name: 'catalog.listarServicos',
    input: z.object({ limite: z.number().int().min(1).max(50).default(10) }),
    policy: policies.public(),
    handler: ({ ctx, input }) =>
      Promise.resolve(
        ok({ limite: input.limite, anonimo: ctx.actorId === null, quando: ctx.clock.now() }),
      ),
  })

  const minhas = defineQuery({
    name: 'teste.minhasReservas',
    input: z.object({ donoId: z.string() }),
    policy: policies.authenticated(),
    authorize: ({ ctx, input }) => requireOwnership(ctx, input.donoId),
    handler: ({ ctx }) => Promise.resolve(ok({ dono: ctx.actorId })),
  })

  const soAdmin = defineQuery({
    name: 'teste.relatorio',
    input: z.object({}),
    policy: policies.anyRole('admin'),
    handler: () => Promise.resolve(ok('segredo-do-admin')),
  })

  it('pública funciona sem sessão, aplica default e devolve JSON puro (Date vira ISO)', async () => {
    const r = await listar.run(await ambiente(), {})
    expect(r).toEqual({
      status: 'ok',
      revision: null,
      data: { limite: 10, anonimo: true, quando: '2027-01-31T15:00:00.000Z' },
    })
  })

  it('validação de campo devolve VALIDATION.FAILED 422 com campos, sem eco do valor', async () => {
    const r = await listar.run(await ambiente(), { limite: 'DROP TABLE' })
    expect(r).toMatchObject({ status: 'error', code: 'VALIDATION.FAILED', httpStatus: 422 })
    expect(JSON.stringify(r)).not.toContain('DROP TABLE')
    if (r.status === 'error') expect(r.fields[0]?.path).toBe('limite')
  })

  it('sem sessão: AUTH.REQUIRED 401, e a validação nem roda (não revela o schema a anônimos)', async () => {
    const r = await minhas.run(await ambiente(), {})
    expect(r).toMatchObject({ status: 'error', code: 'AUTH.REQUIRED', httpStatus: 401 })
  })

  it('papel insuficiente: AUTH.FORBIDDEN 403 e o handler não executa', async () => {
    const r = await soAdmin.run(await ambiente('cliente'), {})
    expect(r).toMatchObject({ status: 'error', code: 'AUTH.FORBIDDEN', httpStatus: 403 })
    expect(JSON.stringify(r)).not.toContain('segredo-do-admin')
    const admin = await soAdmin.run(await ambiente('admin'), {})
    expect(admin).toMatchObject({ status: 'ok', data: 'segredo-do-admin' })
  })

  it('authorize de recurso: dono passa, ID alheio recebe 403', async () => {
    const proprio = await minhas.run(await ambiente('cliente'), { donoId: 'cliente-1' })
    expect(proprio).toMatchObject({ status: 'ok', data: { dono: 'cliente-1' } })
    const alheio = await minhas.run(await ambiente('cliente'), { donoId: 'cliente-2' })
    expect(alheio).toMatchObject({ status: 'error', code: 'AUTH.FORBIDDEN' })
  })

  it('o correlationId do ambiente volta em todo erro', async () => {
    const r = await soAdmin.run(await ambiente('cliente'), {})
    expect(r).toMatchObject({ correlationId: 'corr-teste-1' })
  })

  it('exceção do handler vira SYSTEM.INTERNAL sem vazar o texto', async () => {
    const quebra = defineQuery({
      name: 'teste.quebra',
      input: z.object({}),
      policy: policies.authenticated(),
      handler: () => Promise.reject(new Error('relation "usuarios" does not exist')),
    })
    const r = await quebra.run(await ambiente('cliente'), {})
    expect(r).toMatchObject({ status: 'error', code: 'SYSTEM.INTERNAL', httpStatus: 500 })
    expect(JSON.stringify(r)).not.toContain('usuarios')
  })
})

describe('auth recente (D0071)', () => {
  const sensivel = defineQuery({
    name: 'teste.alterarPermissoes',
    input: z.object({}),
    policy: policies.anyRole('admin'),
    requireRecentAuth: true,
    handler: () => Promise.resolve(ok('feito')),
  })

  it('login recente passa; vencido recebe AUTH.RECENT_REQUIRED 401', async () => {
    const env = await ambiente('admin')
    expect(await sensivel.run(env, {})).toMatchObject({ status: 'ok' })
    relogio.advance(60 * 60 * 1000)
    expect(await sensivel.run(env, {})).toMatchObject({
      status: 'error',
      code: 'AUTH.RECENT_REQUIRED',
      httpStatus: 401,
    })
  })
})

describe('comando: validação do envelope antes de tocar o banco', () => {
  const cancelar = defineCommand({
    name: 'teste.cancelarReserva',
    input: z.object({ reservaId: z.string().min(3) }),
    policy: policies.authenticated(),
    revision: 'required',
    handler: () => Promise.resolve(ok({ cancelada: true }, 4)),
  })

  it('sem idempotencyKey: VALIDATION.FAILED apontando o campo', async () => {
    const r = await cancelar.run(await ambiente('cliente'), {
      reservaId: 'abc',
      expectedRevision: 1,
    })
    expect(r).toMatchObject({ status: 'error', code: 'VALIDATION.FAILED' })
    if (r.status === 'error') expect(r.fields.map((f) => f.path)).toContain('idempotencyKey')
  })

  it('revision "required" sem expectedRevision falha; erros de dados e de envelope vêm juntos', async () => {
    const r = await cancelar.run(await ambiente('cliente'), {
      reservaId: 'a',
      idempotencyKey: 'curta',
    })
    expect(r).toMatchObject({ status: 'error', code: 'VALIDATION.FAILED' })
    if (r.status === 'error') {
      expect(r.fields.map((f) => f.path).sort()).toEqual([
        'expectedRevision',
        'idempotencyKey',
        'reservaId',
      ])
    }
  })

  it('corpo que não é objeto é recusado', async () => {
    for (const corpo of [null, 'texto', [1, 2], 42]) {
      expect(await cancelar.run(await ambiente('cliente'), corpo)).toMatchObject({
        status: 'error',
        code: 'VALIDATION.FAILED',
      })
    }
  })

  it('anônimo recebe AUTH.REQUIRED antes de qualquer validação', async () => {
    expect(await cancelar.run(await ambiente(), {})).toMatchObject({ code: 'AUTH.REQUIRED' })
  })
})
