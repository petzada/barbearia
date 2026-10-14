import type { JobWithMetadata, PgBoss } from 'pg-boss'
import type { Clock } from '~/contracts/clock'
import { createSystemContext } from '../context/request-context'
import { getDeployBarbearia } from '../db/deploy-barbearia'
import { EXTERNAL_OPS_QUEUE, registerExternalOperationsJobs } from '../external-ops/run'
import { INBOX_PROCESS_QUEUE, registerInboxProcessing } from '../inbox/process'
import { logger } from '../logging'
import { startOutboxDispatcher, type OutboxDispatcherHandle } from '../outbox/dispatcher'
import { isRecoveryMode } from '../recovery/state'
import { systemClock } from '../time/clock'
import { DEAD_LETTER_QUEUE, getBoss, stopBoss } from './boss'
import { reportDeadLetter } from './dead-letter'
import { PermanentJobError, describeError } from './failures'
import { EXAMPLE_QUEUE, registerExampleJob } from './example'
import { executeJob, hasJobHandler, listJobHandlers, type JobRuntime } from './handlers'
import { loadModuleJobs } from './load-modules'
import { ensureDeadLetterQueue, ensureQueue, isJobEnvelope } from './queue'

export interface WorkerOptions {
  /** Padrão: a barbearia do deploy (`BARBEARIA_SLUG`). Testes informam a deles. */
  readonly barbeariaId?: string
  readonly clock?: Clock
  /** Intervalo de consulta de cada fila, em segundos (mínimo do pg-boss: 0,5). Padrão 2. */
  readonly pollingIntervalSeconds?: number
  readonly outboxIntervalMs?: number
  /** Adiamento de jobs de efeito externo em modo recuperação (padrão 30 s). */
  readonly recoveryDeferMs?: number
  /** Importa `modules/*\/jobs.ts`. Padrão: sim. */
  readonly loadModules?: boolean
}

export interface RunningWorker {
  readonly boss: PgBoss
  /** Encerramento gracioso: para de buscar jobs novos e espera os em andamento terminarem. */
  stop(timeoutMs?: number): Promise<void>
}

/** Handlers que a própria plataforma traz. Idempotente (o worker pode ser iniciado mais de uma vez em testes). */
function registrarHandlersDaPlataforma(): void {
  if (!hasJobHandler(INBOX_PROCESS_QUEUE.name)) registerInboxProcessing()
  if (!hasJobHandler(EXTERNAL_OPS_QUEUE.name)) registerExternalOperationsJobs()
  if (!hasJobHandler(EXAMPLE_QUEUE.name)) registerExampleJob()
}

async function processarLote(
  jobs: JobWithMetadata<unknown>[],
  executar: (job: JobWithMetadata<unknown>) => Promise<void>,
): Promise<void> {
  for (const job of jobs) await executar(job)
}

export async function startWorker(options: WorkerOptions = {}): Promise<RunningWorker> {
  const clock = options.clock ?? systemClock
  registrarHandlersDaPlataforma()
  if (options.loadModules ?? true) await loadModuleJobs()
  const barbeariaId = options.barbeariaId ?? (await getDeployBarbearia()).id
  const boss = await getBoss('worker')

  const runtime: JobRuntime = {
    clock,
    random: Math.random,
    context: (correlationId) => createSystemContext({ barbeariaId, clock, correlationId }),
    isRecoveryMode: () => isRecoveryMode({ barbeariaId }),
    ...(options.recoveryDeferMs === undefined ? {} : { recoveryDeferMs: options.recoveryDeferMs }),
    resend: async ({ queue, envelope, singletonKey, startAfter }) => {
      await boss.send(queue, envelope, { ...(singletonKey ? { singletonKey } : {}), startAfter })
    },
  }

  const polling = options.pollingIntervalSeconds ?? 2
  const handlers = listJobHandlers()
  for (const { definicao, handler } of handlers) {
    await ensureQueue(boss, definicao)
    await boss.work(
      definicao.name,
      { includeMetadata: true, pollingIntervalSeconds: polling, batchSize: 1 } as const,
      (jobs) =>
        processarLote(jobs, async (job: JobWithMetadata<unknown>) => {
          if (!isJobEnvelope(job.data)) {
            // Job inserido fora do `JobQueue` (sem envelope): não há como retentar com segurança.
            const erro = new PermanentJobError(`Job ${job.id} sem envelope válido.`)
            await reportDeadLetter({
              source: 'job',
              reason: 'permanent',
              ref: job.id,
              queue: definicao.name,
              error: describeError(erro),
            })
            return
          }
          await executeJob(
            { definicao, handler },
            { id: job.id, singletonKey: job.singletonKey },
            job.data,
            runtime,
          )
        }),
    )
  }

  // Jobs que o pg-boss desistiu de executar (crash do processo, expiração) caem aqui.
  await ensureDeadLetterQueue(boss)
  await boss.work(
    DEAD_LETTER_QUEUE,
    { includeMetadata: true, pollingIntervalSeconds: Math.max(polling, 5), batchSize: 1 } as const,
    (jobs) =>
      processarLote(jobs, async (job) => {
        await reportDeadLetter({
          source: 'job',
          reason: 'expired',
          ref: job.sourceId ?? job.id,
          ...(job.sourceName ? { queue: job.sourceName } : {}),
          error: 'o pg-boss esgotou as tentativas dele (crash do processo ou expiração)',
        })
      }),
  )

  const outbox: OutboxDispatcherHandle = startOutboxDispatcher({
    clock,
    intervalMs: options.outboxIntervalMs ?? 1000,
  })

  logger.info(
    { filas: handlers.map((h) => h.definicao.name), barbeariaId },
    'worker pronto: jobs e outbox em execução',
  )
  return {
    boss,
    async stop(timeoutMs = 30_000) {
      await outbox.stop()
      await stopBoss({ graceful: true, timeoutMs })
    },
  }
}
