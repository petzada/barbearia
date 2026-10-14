import type { Clock } from '~/contracts/clock'
import { getDatabase } from '../db/runtime'
import { getDeployBarbearia } from '../db/deploy-barbearia'
import type { Db } from '../db/types'
import { getJobQueue } from '../jobs/queue'
import { logger, redactSensitive } from '../logging'
import { systemClock } from '../time/clock'
import {
  BodyTooLargeError,
  MAX_WEBHOOK_BODY_BYTES,
  readBodyLimited,
  scrubCardData,
  sha256Hex,
} from './body'
import { INBOX_PROCESS_QUEUE, inboxJobKey } from './process'
import { inboxProvedor } from './schema'

export interface WebhookInput {
  /** Corpo bruto, byte a byte como chegou (assinatura costuma ser sobre ele). */
  readonly rawBody: string
  readonly headers: Headers
  readonly url: URL
}

export type VerifyResult = { readonly ok: true } | { readonly ok: false; readonly reason: string }

export interface ParsedWebhook {
  /** Conta do provedor (RN05: id externo = provedor + conta + ambiente). */
  readonly account: string
  readonly environment: string
  /** Id do evento no provedor: base do dedupe. */
  readonly eventId: string
  /** Só os cabeçalhos úteis para diagnóstico. Segredos/assinaturas são removidos mesmo se vierem. */
  readonly headers?: Readonly<Record<string, string>>
}

/** O que cada adapter de provedor (T09–T11) fornece para a rota do webhook. */
export interface WebhookAdapter {
  readonly provider: string
  /** Assinatura/origem pelo mecanismo do provedor. Rejeitar = `{ ok: false }`; nada é persistido. */
  verify(input: WebhookInput): VerifyResult | Promise<VerifyResult>
  /** Extrai a identidade do evento. Lançar = 400. Nunca confie no resto do corpo: consulte a API do provedor. */
  parse(input: WebhookInput): ParsedWebhook
}

export interface ReceiveWebhookDeps {
  readonly db?: Db
  readonly clock?: Clock
  readonly barbeariaId?: string
  readonly maxBodyBytes?: number
}

function resposta(status: number, corpo: Record<string, unknown>): Response {
  return Response.json(corpo, { status })
}

/**
 * Recebe um webhook de provedor (PRD §7.6): limita o corpo → verifica a assinatura → persiste no inbox E
 * enfileira o processamento na MESMA transação → só então responde 2xx. Falha de persistência responde 503
 * (o provedor reenvia). O mesmo evento recebido de novo vira um único registro e responde 200.
 */
export async function receiveWebhook(
  request: Request,
  adapter: WebhookAdapter,
  deps: ReceiveWebhookDeps = {},
): Promise<Response> {
  const limite = deps.maxBodyBytes ?? MAX_WEBHOOK_BODY_BYTES
  let rawBody: string
  try {
    rawBody = await readBodyLimited(request, limite)
  } catch (error) {
    if (error instanceof BodyTooLargeError) return resposta(413, { ok: false })
    logger.warn({ provider: adapter.provider, err: error }, 'webhook: falha ao ler o corpo')
    return resposta(400, { ok: false })
  }

  const entrada: WebhookInput = { rawBody, headers: request.headers, url: new URL(request.url) }
  let verificacao: VerifyResult
  try {
    verificacao = await adapter.verify(entrada)
  } catch (error) {
    logger.error(
      { provider: adapter.provider, err: error },
      'webhook: erro ao verificar a assinatura',
    )
    return resposta(503, { ok: false })
  }
  if (!verificacao.ok) {
    // O motivo vai só para o log: a resposta não ensina o atacante o que falhou.
    logger.warn(
      { provider: adapter.provider, motivo: verificacao.reason },
      'webhook rejeitado na verificação',
    )
    return resposta(401, { ok: false })
  }

  let evento: ParsedWebhook
  try {
    evento = adapter.parse(entrada)
  } catch (error) {
    logger.warn({ provider: adapter.provider, err: error }, 'webhook verificado, mas ilegível')
    return resposta(400, { ok: false })
  }

  try {
    const duplicado = await persistir(adapter.provider, evento, rawBody, deps)
    return resposta(200, { ok: true, duplicate: duplicado })
  } catch (error) {
    logger.error({ provider: adapter.provider, err: error }, 'webhook: falha ao persistir; sem ACK')
    return resposta(503, { ok: false })
  }
}

async function persistir(
  provider: string,
  evento: ParsedWebhook,
  rawBody: string,
  deps: ReceiveWebhookDeps,
): Promise<boolean> {
  const db = deps.db ?? getDatabase()
  const barbeariaId = deps.barbeariaId ?? (await getDeployBarbearia()).id
  const agora = (deps.clock ?? systemClock).now()
  const hash = sha256Hex(rawBody)
  return db.transaction(async (tx) => {
    const inseridos = await tx
      .insert(inboxProvedor)
      .values({
        barbeariaId,
        provedor: provider,
        conta: evento.account,
        ambiente: evento.environment,
        eventoExternoId: evento.eventId,
        hashCorpo: hash,
        cabecalhos: redactSensitive(evento.headers ?? {}) as Record<string, string>,
        corpo: scrubCardData(rawBody),
        recebidoEm: agora,
      })
      .onConflictDoNothing()
      .returning({ id: inboxProvedor.id })
    const novo = inseridos[0]
    if (!novo) return true // mesmo evento já recebido: o original fica intocado
    await getJobQueue().enqueueInTx(tx, {
      queue: INBOX_PROCESS_QUEUE.name,
      payload: { inboxId: novo.id },
      singletonKey: inboxJobKey(novo.id),
    })
    return false
  })
}
