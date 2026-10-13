// Exemplo ponta a ponta (critério de aceite de T02): um comando de "módulo" com política, schema, auth,
// concorrência otimista, idempotência, auditoria e outbox na MESMA transação, devolvendo `Result`.
// É também o modelo para as tasks de módulo (T06 em diante).
import { and, eq } from 'drizzle-orm'
import { pgTable, text } from 'drizzle-orm/pg-core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { FakeOutbox } from '../../src/contracts/fakes'
import { ok } from '../../src/contracts'
import { auditoria, auditWriter } from '../../src/platform/audit'
import { policies, requireOwnership } from '../../src/platform/authz'
import {
  OperationRegistry,
  createOperationFactory,
  defineEvent,
  type ExecutionEnvironment,
} from '../../src/platform/context'
import { assertRevision, mutableColumns } from '../../src/platform/db'
import { defineErrors } from '../../src/platform/errors'
import { uuidSchema } from '../../src/platform/validation'
import { abrirBancoDeTeste, type BancoDeTeste } from './helpers/banco'

// ---- "módulo" de exemplo: schema, erros, eventos e operação ------------------------------------------
const exemploReservas = pgTable('exemplo_reservas', {
  ...mutableColumns(),
  donoId: text('dono_id').notNull(),
  estado: text('estado').notNull(),
})

const ExemploErrors = defineErrors('EXEMPLO', {
  JA_REALIZADA: { httpStatus: 422, message: 'Uma reserva realizada não pode ser cancelada.' },
  NAO_ENCONTRADA: { httpStatus: 422, message: 'Reserva não encontrada.' },
})

const ReservationCancelled = defineEvent<'ReservationCancelled', { reservaId: string }>(
  'ReservationCancelled',
  1,
)

const outbox = new FakeOutbox()
const registro = new OperationRegistry()
const { defineCommand } = createOperationFactory({ publicAllowlist: [], registry: registro })

const cancelarReserva = defineCommand({
  name: 'exemplo.cancelarReserva',
  input: z.object({
    reservaId: uuidSchema,
    forcarFalhaDepoisDeAuditar: z.boolean().default(false),
  }),
  policy: policies.anyRole('cliente', 'admin'),
  revision: 'required',
  handler: async ({ ctx, input, tx, expectedRevision }) => {
    const [reserva] = await tx
      .select()
      .from(exemploReservas)
      .where(
        and(
          eq(exemploReservas.barbeariaId, ctx.barbeariaId),
          eq(exemploReservas.id, input.reservaId),
        ),
      )
      .for('update')
    if (!reserva) throw ExemploErrors.NAO_ENCONTRADA()
    requireOwnership(ctx, reserva.donoId, { orRoles: ['admin'] })
    assertRevision(expectedRevision, reserva.revisao)
    if (reserva.estado === 'realizada') throw ExemploErrors.JA_REALIZADA()

    const novaRevisao = reserva.revisao + 1
    await tx
      .update(exemploReservas)
      .set({ estado: 'cancelada', revisao: novaRevisao })
      .where(eq(exemploReservas.id, reserva.id))
    await auditWriter.record(tx, ctx, {
      action: 'exemplo.cancelarReserva',
      resource: { type: 'reserva', id: reserva.id },
      before: { estado: reserva.estado },
      after: { estado: 'cancelada' },
    })
    await outbox.publishInTx(
      tx,
      ReservationCancelled.create(ctx, {
        aggregateId: reserva.id,
        aggregateRevision: novaRevisao,
        payload: { reservaId: reserva.id },
      }),
    )
    if (input.forcarFalhaDepoisDeAuditar) throw new Error('falha inesperada depois de auditar')
    return ok({ reservaId: reserva.id, estado: 'cancelada' }, novaRevisao)
  },
})

// ---- teste -------------------------------------------------------------------------------------------
let banco: BancoDeTeste

beforeAll(async () => {
  banco = await abrirBancoDeTeste()
  await banco.pool.query(`
    create table if not exists exemplo_reservas (
      id uuid primary key,
      barbearia_id uuid not null references barbearias(id),
      criado_em timestamptz not null default now(),
      atualizado_em timestamptz not null default now(),
      revisao integer not null default 1,
      dono_id text not null,
      estado text not null
    )`)
})
afterAll(async () => {
  await banco.pool.query('drop table if exists exemplo_reservas')
  await banco.encerrar()
})

function ambiente(
  atorId: string | null,
  roles: ('cliente' | 'admin')[] = ['cliente'],
): ExecutionEnvironment {
  return {
    barbeariaId: banco.barbearia.id,
    clock: banco.clock,
    correlationId: `corr-${crypto.randomUUID().slice(0, 12)}`,
    session: atorId
      ? { actorId: atorId, roles, sessionId: 'sessao-1', authTime: banco.clock.now() }
      : null,
  }
}

async function criarReserva(donoId: string, estado = 'confirmada') {
  const [reserva] = await banco.db
    .insert(exemploReservas)
    .values({ barbeariaId: banco.barbearia.id, donoId, estado })
    .returning()
  if (!reserva) throw new Error('reserva não criada')
  return reserva
}

const chave = (): string => crypto.randomUUID()

async function auditoriaDa(reservaId: string) {
  return banco.db
    .select()
    .from(auditoria)
    .where(and(eq(auditoria.barbeariaId, banco.barbearia.id), eq(auditoria.recursoId, reservaId)))
}

describe('exemplo: defineCommand com política, idempotência, auditoria, outbox e Result', () => {
  it('caminho feliz: Result ok com revisão nova; dado, auditoria e evento juntos', async () => {
    const reserva = await criarReserva('cliente-1')
    const eventosAntes = outbox.events.length
    const env = ambiente('cliente-1')
    const resultado = await cancelarReserva.run(env, {
      reservaId: reserva.id,
      expectedRevision: 1,
      idempotencyKey: chave(),
    })

    expect(resultado).toEqual({
      status: 'ok',
      data: { reservaId: reserva.id, estado: 'cancelada' },
      revision: 2,
    })
    const [salva] = await banco.db
      .select()
      .from(exemploReservas)
      .where(eq(exemploReservas.id, reserva.id))
    expect(salva).toMatchObject({ estado: 'cancelada', revisao: 2 })
    const auditorias = await auditoriaDa(reserva.id)
    expect(auditorias).toHaveLength(1)
    expect(auditorias[0]).toMatchObject({
      atorId: 'cliente-1',
      acao: 'exemplo.cancelarReserva',
      antes: { estado: 'confirmada' },
      depois: { estado: 'cancelada' },
      correlationId: env.correlationId,
    })
    expect(outbox.events).toHaveLength(eventosAntes + 1)
    expect(outbox.events.at(-1)).toMatchObject({
      type: 'ReservationCancelled',
      aggregateRevision: 2,
      correlationId: env.correlationId,
    })
  })

  it('reenvio com a mesma chave e o mesmo payload devolve o mesmo Result sem repetir nenhum efeito', async () => {
    const reserva = await criarReserva('cliente-1')
    const corpo = { reservaId: reserva.id, expectedRevision: 1, idempotencyKey: chave() }
    const eventosAntes = outbox.events.length

    const primeiro = await cancelarReserva.run(ambiente('cliente-1'), corpo)
    const segundo = await cancelarReserva.run(ambiente('cliente-1'), corpo)

    expect(primeiro).toMatchObject({ status: 'ok', revision: 2 })
    expect(segundo).toEqual(primeiro)
    expect(await auditoriaDa(reserva.id)).toHaveLength(1)
    expect(outbox.events).toHaveLength(eventosAntes + 1)
    const [salva] = await banco.db
      .select()
      .from(exemploReservas)
      .where(eq(exemploReservas.id, reserva.id))
    expect(salva?.revisao).toBe(2)
  })

  it('mesma chave com payload diferente → IDEMPOTENCY.KEY_REUSED (422) e a outra reserva fica intacta', async () => {
    const a = await criarReserva('cliente-1')
    const b = await criarReserva('cliente-1')
    const mesmaChave = chave()
    await cancelarReserva.run(ambiente('cliente-1'), {
      reservaId: a.id,
      expectedRevision: 1,
      idempotencyKey: mesmaChave,
    })
    const reuso = await cancelarReserva.run(ambiente('cliente-1'), {
      reservaId: b.id,
      expectedRevision: 1,
      idempotencyKey: mesmaChave,
    })
    expect(reuso).toMatchObject({
      status: 'error',
      code: 'IDEMPOTENCY.KEY_REUSED',
      httpStatus: 422,
    })
    const [intacta] = await banco.db
      .select()
      .from(exemploReservas)
      .where(eq(exemploReservas.id, b.id))
    expect(intacta).toMatchObject({ estado: 'confirmada', revisao: 1 })
  })

  it('tela antiga (revisão desatualizada) → CONCURRENCY.REVISION_CONFLICT (409), sem efeito algum', async () => {
    const reserva = await criarReserva('cliente-1')
    const resultado = await cancelarReserva.run(ambiente('cliente-1'), {
      reservaId: reserva.id,
      expectedRevision: 7,
      idempotencyKey: chave(),
    })
    expect(resultado).toMatchObject({
      status: 'error',
      code: 'CONCURRENCY.REVISION_CONFLICT',
      httpStatus: 409,
    })
    expect(await auditoriaDa(reserva.id)).toHaveLength(0)
    const [salva] = await banco.db
      .select()
      .from(exemploReservas)
      .where(eq(exemploReservas.id, reserva.id))
    expect(salva).toMatchObject({ estado: 'confirmada', revisao: 1 })
  })

  it('duas telas cancelando ao mesmo tempo com chaves diferentes: uma vence, a outra recebe 409', async () => {
    const reserva = await criarReserva('cliente-1')
    const tentar = () =>
      cancelarReserva.run(ambiente('cliente-1'), {
        reservaId: reserva.id,
        expectedRevision: 1,
        idempotencyKey: chave(),
      })
    const resultados = await Promise.all([tentar(), tentar()])
    const status = resultados.map((r) => (r.status === 'error' ? r.code : r.status)).sort()
    expect(status).toEqual(['CONCURRENCY.REVISION_CONFLICT', 'ok'])
    expect(await auditoriaDa(reserva.id)).toHaveLength(1)
  })

  it('cliente com ID alheio → AUTH.FORBIDDEN (403); admin pode agir em nome da casa', async () => {
    const reserva = await criarReserva('cliente-1')
    const alheio = await cancelarReserva.run(ambiente('cliente-2'), {
      reservaId: reserva.id,
      expectedRevision: 1,
      idempotencyKey: chave(),
    })
    expect(alheio).toMatchObject({ status: 'error', code: 'AUTH.FORBIDDEN', httpStatus: 403 })
    expect(await auditoriaDa(reserva.id)).toHaveLength(0)

    const admin = await cancelarReserva.run(ambiente('admin-1', ['admin']), {
      reservaId: reserva.id,
      expectedRevision: 1,
      idempotencyKey: chave(),
    })
    expect(admin).toMatchObject({ status: 'ok', revision: 2 })
    expect((await auditoriaDa(reserva.id))[0]).toMatchObject({
      atorId: 'admin-1',
      atorPapeis: ['admin'],
    })
  })

  it('anônimo → AUTH.REQUIRED (401); entrada inválida → VALIDATION.FAILED (422) com campos', async () => {
    const anonimo = await cancelarReserva.run(ambiente(null), {})
    expect(anonimo).toMatchObject({ status: 'error', code: 'AUTH.REQUIRED', httpStatus: 401 })

    const invalida = await cancelarReserva.run(ambiente('cliente-1'), {
      reservaId: 'não-é-uuid',
      idempotencyKey: chave(),
    })
    expect(invalida).toMatchObject({ status: 'error', code: 'VALIDATION.FAILED', httpStatus: 422 })
    if (invalida.status === 'error') {
      expect(invalida.fields.map((f) => f.path).sort()).toEqual(['expectedRevision', 'reservaId'])
    }
  })

  it('erro de regra do módulo usa o código do módulo e não consome a chave', async () => {
    const reserva = await criarReserva('cliente-1', 'realizada')
    const idempotencyKey = chave()
    const corpo = { reservaId: reserva.id, expectedRevision: 1, idempotencyKey }
    const r = await cancelarReserva.run(ambiente('cliente-1'), corpo)
    expect(r).toMatchObject({ status: 'error', code: 'EXEMPLO.JA_REALIZADA', httpStatus: 422 })
    const linhas = await banco.pool.query('select 1 from chaves_idempotencia where chave = $1', [
      idempotencyKey,
    ])
    expect(linhas.rowCount).toBe(0)
  })

  it('falha inesperada depois de auditar e publicar: tudo é desfeito e o cliente só vê SYSTEM.INTERNAL', async () => {
    const reserva = await criarReserva('cliente-1')
    const r = await cancelarReserva.run(ambiente('cliente-1'), {
      reservaId: reserva.id,
      forcarFalhaDepoisDeAuditar: true,
      expectedRevision: 1,
      idempotencyKey: chave(),
    })
    expect(r).toMatchObject({ status: 'error', code: 'SYSTEM.INTERNAL', httpStatus: 500 })
    expect(JSON.stringify(r)).not.toContain('depois de auditar')
    expect(await auditoriaDa(reserva.id)).toHaveLength(0) // auditoria na mesma transação: rollback a leva junto
    const [salva] = await banco.db
      .select()
      .from(exemploReservas)
      .where(eq(exemploReservas.id, reserva.id))
    expect(salva).toMatchObject({ estado: 'confirmada', revisao: 1 })
  })

  it('o schema de exemplo usa as colunas padrão (barbearia_id, UUID v7, revisão)', async () => {
    const { rows } = await banco.pool.query<{ column_name: string; is_nullable: string }>(
      "select column_name, is_nullable from information_schema.columns where table_name = 'exemplo_reservas'",
    )
    const colunas = new Map(rows.map((r) => [r.column_name, r.is_nullable]))
    expect(colunas.get('barbearia_id')).toBe('NO')
    expect(colunas.get('revisao')).toBe('NO')
    const reserva = await criarReserva('cliente-1')
    expect(reserva.id[14]).toBe('7')
  })
})
