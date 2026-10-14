import { and, asc, eq, lte, sql } from 'drizzle-orm'
import type { Clock } from '~/contracts/clock'
import type { DomainEvent } from '~/contracts/events'
import { getDatabase } from '../db/runtime'
import type { Db, Tx } from '../db/types'
import { createSystemContext } from '../context/request-context'
import { reportDeadLetter, type DeadLetterEvent } from '../jobs/dead-letter'
import { classifyFailure, describeError } from '../jobs/failures'
import { DEFAULT_RETRY_POLICY, nextRetryDelayMs, type RetryPolicy } from '../jobs/retry'
import { logger } from '../logging'
import { listEventHandlers } from './registry'
import { outbox, outboxEntregas, type LinhaOutbox } from './schema'

export interface DispatchOptions {
  readonly clock: Clock
  /** Máximo de eventos por chamada (padrão 100). */
  readonly limit?: number
  readonly retry?: RetryPolicy
  readonly random?: () => number
  readonly db?: Db
}

export interface DispatchSummary {
  /** Eventos retirados da fila nesta chamada. */
  readonly events: number
  /** Entregas feitas (handler executado) — entregas repetidas são puladas e não contam. */
  readonly deliveries: number
  readonly retried: number
  readonly failed: number
}

function toDomainEvent(linha: LinhaOutbox): DomainEvent {
  return {
    id: linha.id,
    type: linha.tipo,
    version: linha.versao,
    barbeariaId: linha.barbeariaId,
    aggregateId: linha.agregadoId,
    aggregateRevision: linha.revisaoAgregado,
    occurredAt: linha.ocorridoEm,
    correlationId: linha.correlationId,
    payload: linha.payload,
  }
}

interface ResultadoDoEvento {
  readonly deliveries: number
  readonly retried: boolean
  readonly failed: boolean
  readonly pendencia?: DeadLetterEvent
}

async function entregar(
  tx: Tx,
  linha: LinhaOutbox,
  clock: Clock,
): Promise<{ deliveries: number; erros: unknown[] }> {
  const evento = toDomainEvent(linha)
  const ctx = createSystemContext({
    barbeariaId: linha.barbeariaId,
    clock,
    correlationId: linha.correlationId,
  })
  let deliveries = 0
  const erros: unknown[] = []
  for (const handler of listEventHandlers(linha.tipo)) {
    try {
      // Savepoint por handler: um handler que falha não desfaz a entrega dos outros.
      await tx.transaction(async (sp) => {
        const entrega = await sp
          .insert(outboxEntregas)
          .values({
            handler: handler.name,
            eventoId: linha.id,
            barbeariaId: linha.barbeariaId,
            entregueEm: clock.now(),
          })
          .onConflictDoNothing()
          .returning({ handler: outboxEntregas.handler })
        if (entrega.length === 0) return // (handler, evento) já entregue: idempotência
        await handler.handle(evento, { tx: sp, ctx })
        deliveries += 1
      })
    } catch (error) {
      erros.push(error)
    }
  }
  return { deliveries, erros }
}

async function processar(
  tx: Tx,
  linha: LinhaOutbox,
  options: DispatchOptions,
): Promise<ResultadoDoEvento> {
  const { clock } = options
  const { deliveries, erros } = await entregar(tx, linha, clock)
  if (erros.length === 0) {
    await tx
      .update(outbox)
      .set({ estado: 'processado', processadoEm: clock.now(), ultimoErro: null })
      .where(eq(outbox.id, linha.id))
    return { deliveries, retried: false, failed: false }
  }

  const classes = erros.map(classifyFailure)
  const texto = describeError(erros[0])
  const permanente = classes.some((c) => c.kind === 'permanent')
  const retryAfterMs = Math.max(0, ...classes.map((c) => c.retryAfterMs ?? 0))
  const espera = permanente
    ? null
    : nextRetryDelayMs(
        options.retry ?? DEFAULT_RETRY_POLICY,
        linha.tentativas,
        options.random,
        retryAfterMs,
      )

  if (espera === null) {
    await tx
      .update(outbox)
      .set({ estado: 'falhou', tentativas: linha.tentativas + 1, ultimoErro: texto })
      .where(eq(outbox.id, linha.id))
    return {
      deliveries,
      retried: false,
      failed: true,
      pendencia: {
        source: 'outbox',
        reason: permanente ? 'permanent' : 'exhausted',
        ref: linha.id,
        queue: linha.tipo,
        error: texto,
        correlationId: linha.correlationId,
      },
    }
  }
  await tx
    .update(outbox)
    .set({
      tentativas: linha.tentativas + 1,
      ultimoErro: texto,
      proximaTentativaEm: new Date(clock.now().getTime() + espera),
    })
    .where(eq(outbox.id, linha.id))
  return { deliveries, retried: true, failed: false }
}

/**
 * Entrega eventos pendentes aos handlers registrados. Cada evento é processado em uma transação com
 * `FOR UPDATE SKIP LOCKED` (vários workers podem rodar juntos); a idempotência `(handler, eventId)` garante que o
 * mesmo evento nunca executa o mesmo handler duas vezes, mesmo se for entregue de novo.
 */
export async function dispatchOutbox(options: DispatchOptions): Promise<DispatchSummary> {
  const db = options.db ?? getDatabase()
  const limite = options.limit ?? 100
  let events = 0
  let deliveries = 0
  let retried = 0
  let failed = 0
  while (events < limite) {
    const resultado = await db.transaction(async (tx) => {
      const [linha] = await tx
        .select()
        .from(outbox)
        .where(
          and(eq(outbox.estado, 'pendente'), lte(outbox.proximaTentativaEm, options.clock.now())),
        )
        .orderBy(asc(outbox.criadoEm), asc(outbox.id))
        .limit(1)
        .for('update', { skipLocked: true })
      return linha ? processar(tx, linha, options) : undefined
    })
    if (!resultado) break
    events += 1
    deliveries += resultado.deliveries
    if (resultado.retried) retried += 1
    if (resultado.failed) failed += 1
    if (resultado.pendencia) await reportDeadLetter(resultado.pendencia)
  }
  return { events, deliveries, retried, failed }
}

export interface OutboxDispatcherHandle {
  /** Para o laço e espera o processamento atual até o prazo informado. */
  stop(timeoutMs?: number): Promise<void>
}

/** Laço do worker: esvazia o outbox e dorme `intervalMs` quando não há nada. */
export function startOutboxDispatcher(
  options: DispatchOptions & { readonly intervalMs?: number },
): OutboxDispatcherHandle {
  const intervalo = options.intervalMs ?? 1000
  let parar = false
  let acordar: (() => void) | undefined
  const laco = (async () => {
    while (!parar) {
      try {
        await dispatchOutbox(options)
      } catch (erro) {
        logger.error({ err: erro }, 'dispatcher do outbox falhou; tentará de novo')
      }
      if (parar) break
      await new Promise<void>((resolver) => {
        const timer = setTimeout(resolver, intervalo)
        acordar = () => {
          clearTimeout(timer)
          resolver()
        }
      })
    }
  })()
  return {
    async stop(timeoutMs = Number.POSITIVE_INFINITY) {
      parar = true
      acordar?.()
      if (!Number.isFinite(timeoutMs)) {
        await laco
        return
      }
      if (timeoutMs <= 0) return
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        await Promise.race([
          laco,
          new Promise<void>((resolver) => {
            timer = setTimeout(resolver, timeoutMs)
          }),
        ])
      } finally {
        if (timer) clearTimeout(timer)
      }
    },
  }
}

/** Quantos eventos aguardam entrega (diagnóstico e testes). */
export async function countPendingOutbox(db: Db = getDatabase()): Promise<number> {
  const [linha] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(outbox)
    .where(eq(outbox.estado, 'pendente'))
  return linha?.total ?? 0
}
