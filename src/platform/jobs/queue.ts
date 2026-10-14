import type { PgBoss } from 'pg-boss'
import type { EnqueueResult, JobQueue, JobRequest } from '~/contracts/ports/job-queue'
import type { Executor, Tx } from '../db/types'
import { newId } from '../ids'
import { DEAD_LETTER_QUEUE, getBoss } from './boss'
import { getQueueDefinition, type QueueDefinition } from './queues'
import { drizzleExecutorAsBossDb } from './tx-adapter'

/** O que de fato vai em `data` no pg-boss: o payload do módulo mais o que o runtime precisa para retentar. */
export interface JobEnvelope<TPayload = unknown> {
  readonly v: 1
  readonly queue: string
  readonly payload: TPayload
  readonly correlationId: string
  /** 0 = primeira execução; sobe a cada retentativa nossa (política do PRD §7.6). */
  readonly attempt: number
}

export function isJobEnvelope(valor: unknown): valor is JobEnvelope {
  if (typeof valor !== 'object' || valor === null) return false
  const v = valor as Partial<JobEnvelope>
  return (
    v.v === 1 &&
    typeof v.queue === 'string' &&
    typeof v.correlationId === 'string' &&
    typeof v.attempt === 'number' &&
    'payload' in v
  )
}

const RETENTATIVAS_DO_PGBOSS = 2 // só cobre crash/expiração; a política do PRD roda no nosso wrapper
const ESPERA_DO_PGBOSS_S = 60

/** Garante a fila (idempotente, memoizado por instância do pg-boss). */
const filasGarantidas = new WeakMap<PgBoss, Set<string>>()

function conhecidasDe(boss: PgBoss): Set<string> {
  const conhecidas = filasGarantidas.get(boss) ?? new Set<string>()
  filasGarantidas.set(boss, conhecidas)
  return conhecidas
}

/** Fila para onde o pg-boss manda o job que esgotou as tentativas dele (consumida pelo worker). */
export async function ensureDeadLetterQueue(boss: PgBoss): Promise<void> {
  const conhecidas = conhecidasDe(boss)
  if (conhecidas.has(DEAD_LETTER_QUEUE)) return
  if (!(await boss.getQueue(DEAD_LETTER_QUEUE))) await boss.createQueue(DEAD_LETTER_QUEUE)
  conhecidas.add(DEAD_LETTER_QUEUE)
}

export async function ensureQueue(boss: PgBoss, definicao: QueueDefinition): Promise<void> {
  const conhecidas = conhecidasDe(boss)
  if (conhecidas.has(definicao.name)) return
  await ensureDeadLetterQueue(boss)
  if (!(await boss.getQueue(definicao.name))) {
    await boss.createQueue(definicao.name, {
      policy: definicao.dedupe === 'by-key' ? 'short' : 'standard',
      retryLimit: RETENTATIVAS_DO_PGBOSS,
      retryDelay: ESPERA_DO_PGBOSS_S,
      expireInSeconds: definicao.expireInSeconds,
      deadLetter: DEAD_LETTER_QUEUE,
    })
  }
  conhecidas.add(definicao.name)
}

function validarChave(definicao: QueueDefinition, singletonKey: string | undefined): void {
  if (definicao.dedupe === 'by-key' && !singletonKey) {
    throw new Error(`A fila "${definicao.name}" deduplica por chave: informe singletonKey.`)
  }
  if (definicao.dedupe === 'none' && singletonKey) {
    throw new Error(
      `A fila "${definicao.name}" não deduplica: declare dedupe: 'by-key' em defineQueue para usar singletonKey.`,
    )
  }
}

export function buildEnvelope<TPayload>(request: JobRequest<TPayload>): JobEnvelope<TPayload> {
  return {
    v: 1,
    queue: request.queue,
    payload: request.payload,
    correlationId: request.correlationId ?? newId(),
    attempt: 0,
  }
}

/**
 * `JobQueue` sobre o pg-boss. `enqueueInTx` grava o job NA transação do Drizzle (pg-boss aceita `db` por
 * chamada): rollback não deixa job. Por isso o outbox de jobs não é necessário (só o de eventos de domínio).
 */
export class PgBossJobQueue implements JobQueue {
  constructor(private readonly bossProvider: () => Promise<PgBoss> = () => getBoss()) {}

  enqueueInTx<TPayload>(tx: Tx, job: JobRequest<TPayload>): Promise<EnqueueResult> {
    return this.send(job, tx)
  }

  enqueue<TPayload>(job: JobRequest<TPayload>): Promise<EnqueueResult> {
    return this.send(job, undefined)
  }

  cancelByKey(input: { queue: string; singletonKey: string }): Promise<void> {
    return this.cancel(input, undefined)
  }

  /** Cancela jobs aguardando, na transação do dado (ex.: cancelar o lembrete junto com a reserva). */
  cancelByKeyInTx(tx: Tx, input: { queue: string; singletonKey: string }): Promise<void> {
    return this.cancel(input, tx)
  }

  private async send<TPayload>(
    job: JobRequest<TPayload>,
    executor: Executor | undefined,
  ): Promise<EnqueueResult> {
    const definicao = getQueueDefinition(job.queue)
    validarChave(definicao, job.singletonKey)
    const boss = await this.bossProvider()
    await ensureQueue(boss, definicao)
    const jobId = await boss.send(job.queue, buildEnvelope(job), {
      ...(job.singletonKey ? { singletonKey: job.singletonKey } : {}),
      ...(job.startAfter ? { startAfter: job.startAfter } : {}),
      ...(executor ? { db: drizzleExecutorAsBossDb(executor) } : {}),
    })
    return { jobId }
  }

  private async cancel(
    input: { queue: string; singletonKey: string },
    executor: Executor | undefined,
  ): Promise<void> {
    const definicao = getQueueDefinition(input.queue)
    if (definicao.dedupe !== 'by-key') {
      throw new Error(`A fila "${input.queue}" não usa chave: cancelByKey exige dedupe: 'by-key'.`)
    }
    const boss = await this.bossProvider()
    await ensureQueue(boss, definicao)
    const conexao = executor ? { db: drizzleExecutorAsBossDb(executor) } : {}
    const jobs = await boss.findJobs(input.queue, {
      key: input.singletonKey,
      queued: true,
      ...conexao,
    })
    if (jobs.length > 0) {
      await boss.cancel(
        input.queue,
        jobs.map((j) => j.id),
        conexao,
      )
    }
  }
}

let padrao: PgBossJobQueue | undefined

/** Implementação do port `JobQueue` do processo (web, worker ou script). */
export function getJobQueue(): PgBossJobQueue {
  padrao ??= new PgBossJobQueue()
  return padrao
}
