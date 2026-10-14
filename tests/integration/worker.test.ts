import { sql } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { defineEvent } from '../../src/platform/context'
import { setDeadLetterHook, type DeadLetterEvent } from '../../src/platform/jobs/dead-letter'
import { enqueueExampleJob } from '../../src/platform/jobs/example'
import { PermanentJobError } from '../../src/platform/jobs/failures'
import {
  registerJobHandler,
  resetJobHandlers,
  type JobInvocation,
} from '../../src/platform/jobs/handlers'
import { getJobQueue } from '../../src/platform/jobs/queue'
import { defineQueue } from '../../src/platform/jobs/queues'
import { startWorker, type RunningWorker } from '../../src/platform/jobs/worker'
import { drizzleOutbox } from '../../src/platform/outbox/publish'
import { registerEventHandler, resetEventHandlers } from '../../src/platform/outbox/registry'
import { setRecoveryMode } from '../../src/platform/recovery'
import { abrirBancoDeTeste, type BancoDeTeste } from './helpers/banco'
import { encerrarBoss, esperarAte, filaUnica, prepararBoss } from './helpers/jobs'

const OPCOES = {
  loadModules: false,
  pollingIntervalSeconds: 0.5,
  outboxIntervalMs: 200,
  recoveryDeferMs: 500,
} as const

// Criar filas no pg-boss é DDL no Postgres remoto: dá folga ao prazo padrão de 30 s.
describe('worker (pg-boss + outbox) com Postgres real', { timeout: 120_000 }, () => {
  let banco: BancoDeTeste
  let worker: RunningWorker | undefined
  const pendencias: DeadLetterEvent[] = []

  beforeAll(async () => {
    banco = await abrirBancoDeTeste()
    await prepararBoss()
  })

  afterAll(async () => {
    await encerrarBoss()
    await banco.encerrar()
  })

  afterEach(async () => {
    await worker?.stop(5_000)
    worker = undefined
    await setRecoveryMode(banco.contexto({ atorId: null }), {
      active: false,
      operator: 'teste',
      reason: 'limpeza',
    })
    resetJobHandlers()
    resetEventHandlers()
    setDeadLetterHook(undefined)
    pendencias.length = 0
  })

  async function iniciar() {
    await prepararBoss() // `encerrarBoss` do teste anterior pode ter derrubado a instância
    worker = await startWorker({ barbeariaId: banco.barbearia.id, ...OPCOES })
    return worker
  }

  function capturarPendencias() {
    setDeadLetterHook((e) => {
      pendencias.push(e)
      return Promise.resolve()
    })
  }

  async function estadoDoJob(jobId: string): Promise<string | undefined> {
    const r = await banco.db.execute(
      sql`select state::text as state from pgboss.job where id = ${jobId}`,
    )
    return (r.rows[0] as { state: string } | undefined)?.state
  }

  it('pnpm dev:worker processa um job de exemplo (critério de aceite)', async () => {
    await iniciar()
    const { jobId } = await enqueueExampleJob('olá, worker')
    expect(jobId).toBeTruthy()
    await esperarAte(async () => (await estadoDoJob(jobId ?? '')) === 'completed', {
      descricao: 'job de exemplo',
    })
  })

  it('processa um job entregando payload, contexto de sistema e correlationId de quem enfileirou', async () => {
    const fila = defineQueue({ name: filaUnica('w-ok') })
    const vistos: Array<JobInvocation<{ n: number }>> = []
    registerJobHandler<{ n: number }>(fila, (job) => {
      vistos.push(job)
      return Promise.resolve()
    })
    await iniciar()
    const { jobId } = await getJobQueue().enqueue({
      queue: fila.name,
      payload: { n: 7 },
      correlationId: 'corr-do-chamador',
    })
    await esperarAte(() => vistos.length === 1)
    expect(vistos[0]).toMatchObject({ payload: { n: 7 }, attempt: 0, queue: fila.name, jobId })
    expect(vistos[0]?.ctx).toMatchObject({
      barbeariaId: banco.barbearia.id,
      actorKind: 'system',
      actorId: null,
      correlationId: 'corr-do-chamador',
    })
  })

  it('falha transitória é retentada pela política da fila; permanente não é retentada e abre pendência', async () => {
    capturarPendencias()
    const transitoria = defineQueue({
      name: filaUnica('w-transit'),
      retry: { delaysMs: [0, 200], jitterRatio: 0 },
    })
    const tentativas: number[] = []
    registerJobHandler(transitoria, ({ attempt }) => {
      tentativas.push(attempt)
      return attempt < 2 ? Promise.reject(new Error('API fora do ar')) : Promise.resolve()
    })
    const permanente = defineQueue({ name: filaUnica('w-perm') })
    let chamadasPermanente = 0
    registerJobHandler(permanente, () => {
      chamadasPermanente += 1
      return Promise.reject(new PermanentJobError('credencial inválida'))
    })
    await iniciar()
    await getJobQueue().enqueue({ queue: transitoria.name, payload: {} })
    const { jobId } = await getJobQueue().enqueue({ queue: permanente.name, payload: {} })
    await esperarAte(() => tentativas.length === 3, { descricao: 'três tentativas' })
    expect(tentativas).toEqual([0, 1, 2])
    await esperarAte(() => pendencias.length === 1)
    expect(chamadasPermanente).toBe(1) // sem loop
    expect(pendencias[0]).toMatchObject({
      source: 'job',
      reason: 'permanent',
      queue: permanente.name,
      ref: jobId,
    })
    expect(pendencias[0]?.error).toContain('credencial inválida')
  })

  it('esgotada a política, abre pendência uma única vez', async () => {
    capturarPendencias()
    const fila = defineQueue({
      name: filaUnica('w-esgota'),
      retry: { delaysMs: [0], jitterRatio: 0 },
    })
    let chamadas = 0
    registerJobHandler(fila, () => {
      chamadas += 1
      return Promise.reject(new Error('sempre falha'))
    })
    await iniciar()
    await getJobQueue().enqueue({ queue: fila.name, payload: {} })
    await esperarAte(() => pendencias.length === 1)
    expect(chamadas).toBe(2) // 1 execução + 1 retentativa
    expect(pendencias[0]).toMatchObject({ reason: 'exhausted', queue: fila.name })
  })

  it('modo recuperação bloqueia o job de efeito externo; ao liberar, ele roda (sem consumir retentativa)', async () => {
    const efeito = defineQueue({ name: filaUnica('w-efeito'), externalEffect: true })
    const interno = defineQueue({ name: filaUnica('w-interno') })
    const rodou: string[] = []
    registerJobHandler(efeito, () => {
      rodou.push('efeito')
      return Promise.resolve()
    })
    registerJobHandler(interno, () => {
      rodou.push('interno')
      return Promise.resolve()
    })
    await iniciar()
    await setRecoveryMode(banco.contexto({ atorId: null }), {
      active: true,
      operator: 'teste',
      reason: 'restore simulado',
    })
    await getJobQueue().enqueue({ queue: efeito.name, payload: {} })
    await getJobQueue().enqueue({ queue: interno.name, payload: {} })
    await esperarAte(() => rodou.includes('interno'))
    await new Promise((r) => setTimeout(r, 2_500)) // dá várias chances ao job de efeito rodar (e ele não pode)
    expect(rodou).toEqual(['interno'])

    await setRecoveryMode(banco.contexto({ atorId: null }), {
      active: false,
      operator: 'teste',
      reason: 'conciliado',
    })
    await esperarAte(() => rodou.includes('efeito'), { descricao: 'job de efeito retomado' })
    expect(rodou).toEqual(['interno', 'efeito'])
  })

  it('worker reinicia sem perder jobs agendados nem jobs enfileirados com ele parado', async () => {
    const fila = defineQueue({ name: filaUnica('w-reinicia') })
    const vistos: string[] = []
    registerJobHandler<{ id: string }>(fila, ({ payload }) => {
      vistos.push(payload.id)
      return Promise.resolve()
    })
    await iniciar()
    const agendado = await getJobQueue().enqueue({
      queue: fila.name,
      payload: { id: 'agendado' },
      startAfter: new Date(Date.now() + 3_600_000), // daqui a 1 h
    })
    expect(agendado.jobId).toBeTruthy()
    await new Promise((r) => setTimeout(r, 1_500))
    expect(vistos).toEqual([]) // ainda não é a hora

    // Derruba o worker (parada graciosa) e enfileira com ele fora do ar.
    await worker?.stop(5_000)
    worker = undefined
    await prepararBoss()
    await getJobQueue().enqueue({ queue: fila.name, payload: { id: 'durante-a-parada' } })
    await new Promise((r) => setTimeout(r, 1_500))
    expect(vistos).toEqual([]) // nada roda sem worker; os dois jobs seguem no Postgres
    expect(await estadoDoJob(agendado.jobId ?? '')).toBe('created')

    // A hora do agendado chega enquanto o processo está parado.
    await banco.db.execute(
      sql`update pgboss.job set start_after = now() where id = ${agendado.jobId}`,
    )
    await iniciar() // novo processo
    await esperarAte(() => vistos.length === 2, { descricao: 'jobs retomados' })
    expect([...vistos].sort()).toEqual(['agendado', 'durante-a-parada'])
    expect(await estadoDoJob(agendado.jobId ?? '')).toBe('completed')
  })

  it('o dispatcher do outbox roda dentro do worker e entrega o evento publicado na transação', async () => {
    const Evento = defineEvent<'EventoDoWorker', { n: number }>('EventoDoWorker', 1)
    const recebidos: number[] = []
    registerEventHandler({
      name: filaUnica('w-evento'),
      eventType: 'EventoDoWorker',
      handle: (evento) => {
        recebidos.push((evento.payload as { n: number }).n)
        return Promise.resolve()
      },
    })
    await iniciar()
    const ctx = banco.contexto()
    await banco.db.transaction((tx) =>
      drizzleOutbox.publishInTx(
        tx,
        Evento.create(ctx, { aggregateId: 'agg', aggregateRevision: 1, payload: { n: 5 } }),
      ),
    )
    await esperarAte(() => recebidos.length === 1)
    expect(recebidos).toEqual([5])
  })
})
