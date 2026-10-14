import { eq, sql } from 'drizzle-orm'
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core'
import type { RequestContext } from '~/contracts/context'
import { auditWriter } from '../audit/writer'
import { createSystemContext } from '../context/request-context'
import { getDatabase } from '../db/runtime'
import type { Db } from '../db/types'
import { classifyFailure, describeError, PermanentJobError } from '../jobs/failures'
import { registerJobHandler } from '../jobs/handlers'
import { getJobQueue } from '../jobs/queue'
import { defineQueue } from '../jobs/queues'
import { systemClock } from '../time/clock'
import { inboxProvedor, type LinhaInbox } from './schema'

/**
 * Fila de processamento dos webhooks. `externalEffect`: o processamento consulta a API do provedor e muda
 * estado financeiro, então fica pausado em modo recuperação (o webhook continua sendo recebido e persistido).
 */
export const INBOX_PROCESS_QUEUE = defineQueue({
  name: 'inbox.process',
  dedupe: 'by-key',
  externalEffect: true,
})

export interface InboxRecord {
  readonly id: string
  readonly provider: string
  readonly account: string
  readonly environment: string
  readonly externalEventId: string
  /** Corpo bruto (limitado e sem número de cartão). Nunca é a verdade: consulte o recurso na API do provedor. */
  readonly body: string
  readonly headers: Record<string, string>
  readonly receivedAt: Date
}

export type InboxHandler = (record: InboxRecord, ctx: RequestContext) => Promise<void>

const handlers = new Map<string, InboxHandler>()

/** O adapter de cada provedor (T09–T11) registra aqui o processamento dos seus eventos. */
export function registerInboxHandler(provider: string, handler: InboxHandler): void {
  if (handlers.has(provider)) throw new Error(`Já existe handler de inbox para "${provider}".`)
  handlers.set(provider, handler)
}

/** Só para testes. */
export function resetInboxHandlers(): void {
  handlers.clear()
}

export function inboxJobKey(inboxId: string): string {
  return `inbox:${inboxId}`
}

function toRecord(linha: LinhaInbox): InboxRecord {
  return {
    id: linha.id,
    provider: linha.provedor,
    account: linha.conta,
    environment: linha.ambiente,
    externalEventId: linha.eventoExternoId,
    body: linha.corpo,
    headers: linha.cabecalhos as Record<string, string>,
    receivedAt: linha.recebidoEm,
  }
}

async function marcar(
  db: Db,
  id: string,
  valores: PgUpdateSetSource<typeof inboxProvedor>,
): Promise<void> {
  await db.update(inboxProvedor).set(valores).where(eq(inboxProvedor.id, id))
}

/** Processa um registro do inbox (corpo do job `inbox.process`). Idempotente: registro já processado é ignorado. */
export async function processInboxRecord(
  inboxId: string,
  ctx: RequestContext,
  attempt: number,
  db: Db = getDatabase(),
): Promise<void> {
  const [linha] = await db.select().from(inboxProvedor).where(eq(inboxProvedor.id, inboxId))
  if (!linha) throw new PermanentJobError(`Registro de inbox ${inboxId} não existe.`)
  if (linha.estado === 'processado') return

  const handler = handlers.get(linha.provedor)
  if (!handler) {
    await marcar(db, inboxId, {
      estado: 'falhou',
      ultimoErro: 'sem handler registrado para o provedor',
    })
    throw new PermanentJobError(`Nenhum handler de inbox registrado para "${linha.provedor}".`)
  }

  await marcar(db, inboxId, {
    estado: 'processando',
    tentativas: sql`${inboxProvedor.tentativas} + 1`,
  })
  try {
    await handler(toRecord(linha), ctx)
  } catch (error) {
    const esgotado = attempt >= INBOX_PROCESS_QUEUE.retry.delaysMs.length
    const definitivo = classifyFailure(error).kind === 'permanent' || esgotado
    await marcar(db, inboxId, {
      estado: definitivo ? 'falhou' : 'recebido',
      ultimoErro: describeError(error),
    })
    throw error // o wrapper do job decide: retentar ou abrir pendência
  }
  await marcar(db, inboxId, {
    estado: 'processado',
    processadoEm: ctx.clock.now(),
    ultimoErro: null,
  })
}

/** O worker chama no boot (registro explícito: nada de efeito colateral ao importar o módulo). */
export function registerInboxProcessing(): void {
  registerJobHandler<{ inboxId: string }>(INBOX_PROCESS_QUEUE, ({ payload, ctx, attempt }) =>
    processInboxRecord(payload.inboxId, ctx, attempt),
  )
}

export interface ReprocessInboxInput {
  readonly inboxId: string
  /** Obrigatório: vai para a auditoria. */
  readonly reason: string
  readonly requestedBy: string
}

/**
 * Manda um registro do inbox de novo para processamento. NUNCA apaga nem altera o registro original (corpo,
 * hash, recebido_em): só o devolve ao estado `recebido`, conta o reprocessamento, agenda o job e audita.
 */
export async function reprocessInboxRecord(
  input: ReprocessInboxInput,
  db: Db = getDatabase(),
): Promise<void> {
  const motivo = input.reason.trim()
  if (motivo === '')
    throw new Error('O motivo é obrigatório para reprocessar um registro do inbox.')
  await db.transaction(async (tx) => {
    const [linha] = await tx
      .select()
      .from(inboxProvedor)
      .where(eq(inboxProvedor.id, input.inboxId))
      .for('update')
    if (!linha) throw new Error(`Registro de inbox ${input.inboxId} não existe.`)
    if (linha.estado === 'recebido' || linha.estado === 'processando') {
      throw new Error(`O registro ${input.inboxId} já está na fila de processamento.`)
    }
    await tx
      .update(inboxProvedor)
      .set({ estado: 'recebido', reprocessamentos: sql`${inboxProvedor.reprocessamentos} + 1` })
      .where(eq(inboxProvedor.id, linha.id))
    const ctx = createSystemContext({ barbeariaId: linha.barbeariaId, clock: systemClock })
    await getJobQueue().enqueueInTx(tx, {
      queue: INBOX_PROCESS_QUEUE.name,
      payload: { inboxId: linha.id },
      singletonKey: inboxJobKey(linha.id),
      correlationId: ctx.correlationId,
    })
    await auditWriter.record(tx, ctx, {
      action: 'inbox.reprocess',
      resource: { type: 'inbox_provedor', id: linha.id },
      before: { estado: linha.estado },
      after: { estado: 'recebido', solicitadoPor: input.requestedBy },
      reason: motivo,
    })
  })
}
