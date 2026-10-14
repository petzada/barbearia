import { afterEach, describe, expect, it } from 'vitest'
import { createSystemContext } from '../../src/platform/context/request-context'
import { setDeadLetterHook, type DeadLetterEvent } from '../../src/platform/jobs/dead-letter'
import { PermanentJobError, RetryableJobError } from '../../src/platform/jobs/failures'
import { executeJob, type JobRuntime } from '../../src/platform/jobs/handlers'
import type { JobEnvelope } from '../../src/platform/jobs/queue'
import {
  defineQueue,
  getQueueDefinition,
  resetQueueDefinitions,
} from '../../src/platform/jobs/queues'
import { createManualClock } from '../../src/platform/time/clock'

const clock = createManualClock('2027-01-31T15:00:00Z')

function montar(recovery = false) {
  const reenvios: Array<{ attempt: number; startAfter: Date; singletonKey: string | null }> = []
  const runtime: JobRuntime = {
    clock,
    random: () => 0.5, // jitter zero
    context: (correlationId) => createSystemContext({ barbeariaId: 'b-1', clock, correlationId }),
    isRecoveryMode: () => Promise.resolve(recovery),
    resend: ({ envelope, startAfter, singletonKey }) => {
      reenvios.push({ attempt: envelope.attempt, startAfter, singletonKey })
      return Promise.resolve()
    },
  }
  return { runtime, reenvios }
}

const envelope = (queue: string, attempt = 0): JobEnvelope => ({
  v: 1,
  queue,
  payload: { a: 1 },
  correlationId: 'corr-1',
  attempt,
})
const job = { id: 'job-1', singletonKey: 'chave-1' }

describe('execução de job: política de retentativa', () => {
  const pendencias: DeadLetterEvent[] = []
  afterEach(() => {
    resetQueueDefinitions()
    setDeadLetterHook(undefined)
    pendencias.length = 0
  })
  const capturar = () =>
    setDeadLetterHook((e) => {
      pendencias.push(e)
      return Promise.resolve()
    })

  it('sucesso: não reenvia nem abre pendência', async () => {
    capturar()
    const fila = defineQueue({ name: 'teste.sucesso' })
    const { runtime, reenvios } = montar()
    await executeJob(
      { definicao: fila, handler: () => Promise.resolve() },
      job,
      envelope(fila.name),
      runtime,
    )
    expect(reenvios).toEqual([])
    expect(pendencias).toEqual([])
  })

  it('falha transitória reenvia com attempt+1, mesma chave e a espera da política', async () => {
    const fila = defineQueue({
      name: 'teste.transitoria',
      retry: { delaysMs: [0, 60_000, 300_000], jitterRatio: 0.2 },
    })
    const { runtime, reenvios } = montar()
    const registrado = { definicao: fila, handler: () => Promise.reject(new Error('timeout')) }

    await executeJob(registrado, job, envelope(fila.name, 0), runtime)
    await executeJob(registrado, job, envelope(fila.name, 1), runtime)
    await executeJob(registrado, job, envelope(fila.name, 2), runtime)
    expect(reenvios.map((r) => r.attempt)).toEqual([1, 2, 3])
    expect(reenvios.map((r) => r.startAfter.getTime() - clock.now().getTime())).toEqual([
      0, 60_000, 300_000,
    ])
    expect(reenvios.every((r) => r.singletonKey === 'chave-1')).toBe(true)
  })

  it('esgotada a política: pendência (exhausted), sem novo reenvio', async () => {
    capturar()
    const fila = defineQueue({ name: 'teste.esgota', retry: { delaysMs: [0] } })
    const { runtime, reenvios } = montar()
    await executeJob(
      { definicao: fila, handler: () => Promise.reject(new Error('sempre')) },
      job,
      envelope(fila.name, 1),
      runtime,
    )
    expect(reenvios).toEqual([])
    expect(pendencias).toMatchObject([
      {
        source: 'job',
        reason: 'exhausted',
        queue: 'teste.esgota',
        ref: 'job-1',
        correlationId: 'corr-1',
      },
    ])
  })

  it('erro permanente: pendência imediata (permanent), sem retentativa', async () => {
    capturar()
    const fila = defineQueue({ name: 'teste.permanente' })
    const { runtime, reenvios } = montar()
    await executeJob(
      { definicao: fila, handler: () => Promise.reject(new PermanentJobError('401 do provedor')) },
      job,
      envelope(fila.name),
      runtime,
    )
    expect(reenvios).toEqual([])
    expect(pendencias).toMatchObject([{ reason: 'permanent' }])
    expect(pendencias[0]?.error).toContain('401 do provedor')
  })

  it('Retry-After do provedor estende a espera', async () => {
    const fila = defineQueue({
      name: 'teste.retry-after',
      retry: { delaysMs: [1000], jitterRatio: 0 },
    })
    const { runtime, reenvios } = montar()
    await executeJob(
      {
        definicao: fila,
        handler: () => Promise.reject(new RetryableJobError('429', { retryAfterMs: 90_000 })),
      },
      job,
      envelope(fila.name),
      runtime,
    )
    expect(reenvios[0]?.startAfter.getTime()).toBe(clock.now().getTime() + 90_000)
  })

  it('modo recuperação: job de efeito externo não chama o handler e é adiado sem gastar tentativa', async () => {
    const fila = defineQueue({ name: 'teste.efeito', externalEffect: true })
    const { runtime, reenvios } = montar(true)
    let chamado = false
    await executeJob(
      {
        definicao: fila,
        handler: () => {
          chamado = true
          return Promise.resolve()
        },
      },
      job,
      envelope(fila.name, 2),
      runtime,
    )
    expect(chamado).toBe(false)
    expect(reenvios).toMatchObject([{ attempt: 2 }])
  })
})

describe('definição de filas', () => {
  afterEach(() => resetQueueDefinitions())

  it('valida o nome e recusa redefinição incompatível', () => {
    expect(() => defineQueue({ name: 'Nome Inválido' })).toThrow(/inválido/)
    defineQueue({ name: 'agenda.lembrete', dedupe: 'by-key' })
    expect(defineQueue({ name: 'agenda.lembrete', dedupe: 'by-key' }).name).toBe('agenda.lembrete') // idempotente
    expect(() => defineQueue({ name: 'agenda.lembrete' })).toThrow(/outra configuração/)
    expect(() => getQueueDefinition('nao.existe')).toThrow(/não foi definida/)
  })
})
