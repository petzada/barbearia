import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { auditWriter } from '../../src/platform/audit/writer'
import { PgBossJobQueue } from '../../src/platform/jobs/queue'
import { defineQueue, resetQueueDefinitions } from '../../src/platform/jobs/queues'
import { abrirBancoDeTeste, type BancoDeTeste } from './helpers/banco'
import { contarJobs, encerrarBoss, filaUnica, prepararBoss } from './helpers/jobs'

// Decisão "pg-boss na transação × outbox" (PRD §7.5, T03 escopo 2): o pg-boss 12 aceita `db` por chamada, então o
// job nasce na MESMA transação do Drizzle. Estes testes são a evidência.
describe('JobQueue (pg-boss) na transação do Drizzle', () => {
  let banco: BancoDeTeste
  const fila = filaUnica('teste-tx')
  const filaDedupe = filaUnica('teste-dedupe')
  const queue = new PgBossJobQueue()

  beforeAll(async () => {
    banco = await abrirBancoDeTeste()
    await prepararBoss()
    defineQueue({ name: fila })
    defineQueue({ name: filaDedupe, dedupe: 'by-key' })
  })

  afterAll(async () => {
    await encerrarBoss()
    await banco.encerrar()
    resetQueueDefinitions()
  })

  it('commit confirma o dado, a auditoria e o job juntos', async () => {
    const ctx = banco.contexto()
    await banco.db.transaction(async (tx) => {
      await auditWriter.record(tx, ctx, {
        action: 'teste.commit',
        resource: { type: 'teste', id: 'commit' },
      })
      await queue.enqueueInTx(tx, {
        queue: fila,
        payload: { n: 1 },
        correlationId: ctx.correlationId,
      })
    })
    expect(await contarJobs(banco.db, fila)).toBe(1)
    const auditoria = await banco.db.execute(
      sql`select count(*)::int as total from auditoria where correlation_id = ${ctx.correlationId}`,
    )
    expect(Number((auditoria.rows[0] as { total: number }).total)).toBe(1)
  })

  it('rollback da transação não deixa job nem auditoria', async () => {
    const ctx = banco.contexto()
    await expect(
      banco.db.transaction(async (tx) => {
        await auditWriter.record(tx, ctx, {
          action: 'teste.rollback',
          resource: { type: 'teste', id: 'rollback' },
        })
        const { jobId } = await queue.enqueueInTx(tx, { queue: fila, payload: { n: 2 } })
        expect(jobId).toBeTruthy() // dentro da transação o job existe...
        throw new Error('falha depois de enfileirar')
      }),
    ).rejects.toThrow('falha depois de enfileirar')
    // ...e depois do rollback não sobra nada.
    expect(await contarJobs(banco.db, fila)).toBe(1) // só o do teste anterior
    const auditoria = await banco.db.execute(
      sql`select count(*)::int as total from auditoria where correlation_id = ${ctx.correlationId}`,
    )
    expect(Number((auditoria.rows[0] as { total: number }).total)).toBe(0)
  })

  it('startAfter agenda o job para o instante pedido', async () => {
    const instante = new Date(Date.now() + 3_600_000)
    const { jobId } = await queue.enqueue({ queue: fila, payload: { n: 3 }, startAfter: instante })
    expect(jobId).toBeTruthy()
    const resultado = await banco.db.execute(
      sql`select start_after from pgboss.job where id = ${jobId}`,
    )
    const gravado = new Date((resultado.rows[0] as { start_after: string }).start_after)
    expect(Math.abs(gravado.getTime() - instante.getTime())).toBeLessThan(1000)
  })

  it('singletonKey deduplica jobs aguardando (a segunda chamada devolve jobId nulo)', async () => {
    const primeiro = await queue.enqueue({
      queue: filaDedupe,
      payload: { v: 1 },
      singletonKey: 'k1',
    })
    const segundo = await queue.enqueue({
      queue: filaDedupe,
      payload: { v: 2 },
      singletonKey: 'k1',
    })
    const outraChave = await queue.enqueue({
      queue: filaDedupe,
      payload: { v: 3 },
      singletonKey: 'k2',
    })
    expect(primeiro.jobId).toBeTruthy()
    expect(segundo.jobId).toBeNull()
    expect(outraChave.jobId).toBeTruthy()
    expect(await contarJobs(banco.db, filaDedupe)).toBe(2)
  })

  it('cancelByKey cancela o job aguardando; dentro de transação, o cancelamento também sofre rollback', async () => {
    await queue.enqueue({ queue: filaDedupe, payload: {}, singletonKey: 'cancelar-1' })
    await expect(
      banco.db.transaction(async (tx) => {
        await queue.cancelByKeyInTx(tx, { queue: filaDedupe, singletonKey: 'cancelar-1' })
        throw new Error('desfaz')
      }),
    ).rejects.toThrow('desfaz')
    expect(await contarJobs(banco.db, filaDedupe, ['created'])).toBe(3) // k1, k2 e cancelar-1 ainda vivos

    await queue.cancelByKey({ queue: filaDedupe, singletonKey: 'cancelar-1' })
    expect(await contarJobs(banco.db, filaDedupe, ['cancelled'])).toBe(1)
  })

  it('fila não definida, ou chave em fila sem dedupe, é erro de programação', async () => {
    await expect(queue.enqueue({ queue: 'fila.inexistente', payload: {} })).rejects.toThrow(
      /não foi definida/,
    )
    await expect(queue.enqueue({ queue: fila, payload: {}, singletonKey: 'x' })).rejects.toThrow(
      /não deduplica/,
    )
    await expect(queue.enqueue({ queue: filaDedupe, payload: {} })).rejects.toThrow(/singletonKey/)
  })
})
