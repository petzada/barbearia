import type { Clock } from '~/contracts/clock'
import type { RequestContext } from '~/contracts/context'
import { SystemErrors } from '../errors/generic'
import { isAppError } from '../errors/app-error'
import { logger } from '../logging'
import { reportDeadLetter } from './dead-letter'
import { classifyFailure, describeError } from './failures'
import type { JobEnvelope } from './queue'
import type { QueueDefinition } from './queues'
import { nextRetryDelayMs } from './retry'

export interface JobInvocation<TPayload = unknown> {
  readonly payload: TPayload
  /** Contexto de sistema (sem ator) com o `correlationId` de quem enfileirou. */
  readonly ctx: RequestContext
  /** 0 = primeira execução. */
  readonly attempt: number
  readonly jobId: string
  readonly queue: string
}

/**
 * Handler de job. Deve ser idempotente (entrega pelo menos uma vez). Lançar `PermanentJobError`/`AppError` não
 * retentável vai direto para pendência; qualquer outro erro é retentado conforme a política da fila.
 */
export type JobHandler<TPayload = unknown> = (job: JobInvocation<TPayload>) => Promise<void>

interface Registrado {
  readonly definicao: QueueDefinition
  readonly handler: JobHandler
}

const handlers = new Map<string, Registrado>()

/** Cada módulo registra os seus em `modules/<m>/jobs.ts`; o worker importa esses arquivos no boot. */
export function registerJobHandler<TPayload>(
  definicao: QueueDefinition,
  handler: JobHandler<TPayload>,
): void {
  if (handlers.has(definicao.name)) {
    throw new Error(`Já existe handler para a fila "${definicao.name}".`)
  }
  handlers.set(definicao.name, { definicao, handler: handler as JobHandler })
}

export function listJobHandlers(): readonly Registrado[] {
  return [...handlers.values()]
}

/** Só para testes. */
export function resetJobHandlers(): void {
  handlers.clear()
}

/** Dependências do runtime de execução; o worker injeta as reais, os testes injetam controláveis. */
export interface JobRuntime {
  readonly clock: Clock
  readonly random: () => number
  readonly context: (correlationId: string) => RequestContext
  readonly isRecoveryMode: () => Promise<boolean>
  /** Quanto adiar um job de efeito externo em modo recuperação. Padrão: 30 s. */
  readonly recoveryDeferMs?: number
  /** Reenfileira o envelope (mesma chave de dedupe) para depois do instante. */
  readonly resend: (input: {
    queue: string
    envelope: JobEnvelope
    singletonKey: string | null
    startAfter: Date
  }) => Promise<void>
}

export interface RunningJob {
  readonly id: string
  readonly singletonKey: string | null
}

const ESPERA_EM_RECUPERACAO_PADRAO_MS = 30_000

function isRecoveryModeError(error: unknown): boolean {
  return isAppError(error) && error.code === SystemErrors.codes.RECOVERY_MODE
}

/**
 * Executa um job com a política do PRD §7.6: transitório → retentativa agendada (imediato, 1, 5, 15, 60 min com
 * jitter); permanente ou esgotado → pendência via hook, sem loop. Em modo recuperação, jobs de efeito externo não
 * rodam: são adiados (D0078). Só lança se a própria infraestrutura de retentativa falhar (aí o pg-boss repete).
 */
export async function executeJob(
  registrado: Registrado,
  job: RunningJob,
  envelope: JobEnvelope,
  runtime: JobRuntime,
): Promise<void> {
  const { definicao, handler } = registrado
  const agora = (): Date => runtime.clock.now()
  const adiar = (ms: number, proximo: JobEnvelope): Promise<void> =>
    runtime.resend({
      queue: definicao.name,
      envelope: proximo,
      singletonKey: job.singletonKey,
      startAfter: new Date(agora().getTime() + ms),
    })

  if (definicao.externalEffect && (await runtime.isRecoveryMode())) {
    logger.warn(
      { queue: definicao.name, jobId: job.id },
      'modo recuperação: job de efeito externo adiado',
    )
    await adiar(runtime.recoveryDeferMs ?? ESPERA_EM_RECUPERACAO_PADRAO_MS, envelope)
    return
  }

  const ctx = runtime.context(envelope.correlationId)
  try {
    await handler({
      payload: envelope.payload,
      ctx,
      attempt: envelope.attempt,
      jobId: job.id,
      queue: definicao.name,
    })
    return
  } catch (error) {
    if (isRecoveryModeError(error)) {
      await adiar(runtime.recoveryDeferMs ?? ESPERA_EM_RECUPERACAO_PADRAO_MS, envelope)
      return
    }
    await tratarFalha({ error, definicao, job, envelope, runtime, adiar })
  }
}

async function tratarFalha(entrada: {
  error: unknown
  definicao: QueueDefinition
  job: RunningJob
  envelope: JobEnvelope
  runtime: JobRuntime
  adiar: (ms: number, proximo: JobEnvelope) => Promise<void>
}): Promise<void> {
  const { error, definicao, job, envelope, runtime, adiar } = entrada
  const classe = classifyFailure(error)
  const texto = describeError(error)
  const base = { queue: definicao.name, jobId: job.id, correlationId: envelope.correlationId }

  if (classe.kind === 'permanent') {
    logger.error({ ...base, erro: texto }, 'job falhou de forma permanente: sem retentativa')
    await reportDeadLetter({
      source: 'job',
      reason: 'permanent',
      ref: job.id,
      queue: definicao.name,
      error: texto,
      correlationId: envelope.correlationId,
    })
    return
  }
  const espera = nextRetryDelayMs(
    definicao.retry,
    envelope.attempt,
    runtime.random,
    classe.retryAfterMs,
  )
  if (espera === null) {
    logger.error({ ...base, erro: texto }, 'job esgotou as retentativas')
    await reportDeadLetter({
      source: 'job',
      reason: 'exhausted',
      ref: job.id,
      queue: definicao.name,
      error: texto,
      correlationId: envelope.correlationId,
    })
    return
  }
  logger.warn(
    { ...base, tentativa: envelope.attempt + 1, esperaMs: espera, erro: texto },
    'job falhou: retentativa agendada',
  )
  await adiar(espera, { ...envelope, attempt: envelope.attempt + 1 })
}

export function hasJobHandler(queue: string): boolean {
  return handlers.has(queue)
}
