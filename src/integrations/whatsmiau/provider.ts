import type { RequestContext } from '~/contracts/context'
import type {
  NotificationMessage,
  NotificationOutcome,
  NotificationProvider,
} from '~/contracts/ports/notification-provider'
import { createSystemContext } from '~/platform/context/request-context'
import { getDeployBarbearia } from '~/platform/db/deploy-barbearia'
import type { Db } from '~/platform/db/types'
import { isAppError } from '~/platform/errors/app-error'
import { runExternalOperation } from '~/platform/external-ops'
import { SystemErrors } from '~/platform/errors/generic'
import { logger } from '~/platform/logging'
import { systemClock } from '~/platform/time/clock'
import { loadEnv, type Env } from '~/platform/validation/env'
import { channelConfig } from './config'
import {
  DrizzleDeliveryStore,
  messageInput,
  payloadMatches,
  publicExternalId,
  validE164,
  type DeliveryStore,
} from './deliveries'
import { checkHealth, sendText, WhatsMiauHttpError, withTimeout } from './http'
import { getWhatsMiauSendOperation } from './operations'

export interface WhatsMiauProviderOptions {
  readonly env?: Env
  readonly db?: Db
  readonly context?: RequestContext
  readonly store?: DeliveryStore
  readonly fetcher?: typeof fetch
  readonly timeoutMs?: number
  readonly maxMessagesPerMinute?: number
}

export function createWhatsMiauNotificationProvider(
  options: WhatsMiauProviderOptions = {},
): NotificationProvider {
  const env = options.env ?? loadEnv()
  const storeFor = () => options.store ?? new DrizzleDeliveryStore(options.db)
  getWhatsMiauSendOperation()

  return {
    async send(message) {
      if (!validE164(message.toE164)) {
        return { status: 'permanent_failure', reason: 'telefone_invalido' }
      }
      const config = channelConfig(message.channel, env)
      const ctx = await resolveContext(options.context)
      const store = storeFor()
      let delivery
      try {
        delivery = await store.createOrGet(ctx, messageInput(message, config?.instance))
      } catch {
        logger.error({ channel: message.channel }, 'WhatsMiau: falha ao registrar entrega')
        return { status: 'transient_failure', reason: 'persistencia_indisponivel' }
      }
      const entrada = messageInput(message, config?.instance)
      if (!payloadMatches(delivery, entrada)) {
        return { status: 'permanent_failure', reason: 'chave_idempotente_reutilizada' }
      }
      if (delivery.estado === 'enviado' || delivery.estado === 'confirmado') {
        return { status: 'sent', externalId: publicExternalId(delivery) }
      }
      if (delivery.estado === 'falhou') {
        return { status: 'permanent_failure', reason: delivery.ultimoErro ?? 'falha_permanente' }
      }
      if (!config) {
        await marcarEntrega(store, ctx, delivery.id, message.channel, {
          state: 'falhou',
          error: 'configuracao_ausente',
        })
        return { status: 'permanent_failure', reason: 'configuracao_ausente' }
      }

      if (message.channel === 'avisos') {
        return enviarAviso(ctx, options.db, delivery.id, message)
      }
      // OTP é síncrono: a chamada nunca fica agendada para retentativa automática (D0017).
      if (delivery.tentativas > 0) {
        return { status: 'transient_failure', reason: delivery.ultimoErro ?? 'envio_interrompido' }
      }
      if (
        !(await marcarEntrega(store, ctx, delivery.id, message.channel, {
          state: 'pendente',
          attempts: 1,
        }))
      ) {
        return { status: 'transient_failure', reason: 'persistencia_indisponivel' }
      }
      let resposta: Awaited<ReturnType<typeof sendText>>
      try {
        resposta = await withTimeout(options.timeoutMs ?? 10_000, (signal) =>
          sendText(
            config,
            { toE164: message.toE164, text: message.text, deliveryId: delivery.id },
            {
              fetcher: options.fetcher,
              signal,
              maxMessagesPerMinute: options.maxMessagesPerMinute,
            },
          ),
        )
      } catch (error) {
        if (error instanceof WhatsMiauHttpError && !error.transient) {
          await marcarEntrega(store, ctx, delivery.id, message.channel, {
            state: 'falhou',
            attempts: 1,
            error: `api_http_${error.status}`,
          })
          return { status: 'permanent_failure', reason: `api_http_${error.status}` }
        }
        const reason =
          error instanceof WhatsMiauHttpError ? `api_http_${error.status}` : 'api_indisponivel'
        await marcarEntrega(store, ctx, delivery.id, message.channel, {
          state: 'pendente',
          attempts: 1,
          error: reason,
        })
        return { status: 'transient_failure', reason }
      }
      const saved = await marcarEntrega(store, ctx, delivery.id, message.channel, {
        state: 'enviado',
        attempts: 1,
        externalId: resposta.externalId,
        error: null,
      })
      if (!saved) return { status: 'transient_failure', reason: 'persistencia_indisponivel' }
      return { status: 'sent', externalId: resposta.externalId }
    },
    async health(channel) {
      const config = channelConfig(channel, env)
      if (!config) return { channel, connected: false, detail: 'configuracao_ausente' }
      return checkHealth(channel, config, options.fetcher)
    },
  }
}

async function enviarAviso(
  ctx: RequestContext,
  db: Db | undefined,
  deliveryId: string,
  message: NotificationMessage,
): Promise<NotificationOutcome> {
  try {
    const resultado = await runExternalOperation(
      ctx,
      getWhatsMiauSendOperation(),
      {
        idempotencyKey: message.idempotencyKey,
        target: `whatsapp:${message.channel}`,
        input: {
          deliveryId,
          channel: message.channel,
          toE164: message.toE164,
          text: message.text,
        },
      },
      db ? { db } : {},
    )
    if (resultado.status === 'confirmada')
      return { status: 'sent', externalId: resultado.result.externalId }
    if (resultado.status === 'falhou') {
      return { status: 'permanent_failure', reason: resultado.error ?? 'falha_permanente' }
    }
    return { status: 'transient_failure', reason: resultado.status }
  } catch (error) {
    if (isAppError(error) && error.code === SystemErrors.codes.RECOVERY_MODE) {
      return { status: 'transient_failure', reason: 'modo_recuperacao' }
    }
    logger.warn(
      { errorName: error instanceof Error ? error.name : 'unknown', channel: 'avisos' },
      'WhatsMiau: operação externa pendente',
    )
    return { status: 'transient_failure', reason: 'operacao_pendente' }
  }
}

async function marcarEntrega(
  store: DeliveryStore,
  ctx: RequestContext,
  deliveryId: string,
  channel: string,
  update: Parameters<DeliveryStore['mark']>[2],
): Promise<boolean> {
  try {
    await store.mark(ctx, deliveryId, update)
    return true
  } catch {
    // D0010: erro do banco pode incluir valores vinculados à entrega; o log registra apenas o canal.
    logger.error({ channel }, 'WhatsMiau: falha ao atualizar entrega')
    return false
  }
}

async function resolveContext(context?: RequestContext): Promise<RequestContext> {
  if (context) return context
  const barbearia = await getDeployBarbearia()
  return createSystemContext({ barbeariaId: barbearia.id, clock: systemClock })
}
