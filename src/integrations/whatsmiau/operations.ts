import type {
  ExternalCallContext,
  ExternalOperationDefinition,
  ResolvedExternalOperation,
} from '~/platform/external-ops'
import type { JsonValue } from '~/contracts/json'
import {
  defineExternalOperation,
  ExternalNotAppliedError,
  getExternalOperation,
} from '~/platform/external-ops'
import { PermanentJobError } from '~/platform/jobs/failures'
import { loadEnv } from '~/platform/validation/env'
import { channelConfig } from './config'
import { DrizzleDeliveryStore } from './deliveries'
import { sendText, WhatsMiauHttpError } from './http'

interface SendOperationInput extends Record<string, JsonValue> {
  readonly deliveryId: string
  readonly channel: 'otp' | 'avisos'
  readonly toE164: string
  readonly text: string
}

interface SendOperationOutput extends Record<string, JsonValue> {
  readonly externalId: string
}

const DEFINITION: ExternalOperationDefinition<SendOperationInput, SendOperationOutput> = {
  type: 'whatsmiau.send-message',
  timeoutMs: 10_000,
  execute: async (
    input: SendOperationInput,
    call: ExternalCallContext,
  ): Promise<SendOperationOutput> => {
    const env = loadEnv()
    const config = channelConfig(input.channel, env)
    const store = new DrizzleDeliveryStore()
    if (!config) {
      await store.mark(call.ctx, input.deliveryId, {
        state: 'falhou',
        attempts: call.attempt,
        error: 'configuracao_ausente',
      })
      throw new PermanentJobError('Configuração WhatsMiau ausente para o canal solicitado.')
    }

    await store.mark(call.ctx, input.deliveryId, { state: 'pendente', attempts: call.attempt })
    try {
      const resposta = await sendText(
        config,
        { toE164: input.toE164, text: input.text, deliveryId: input.deliveryId },
        { signal: call.signal },
      )
      await store.mark(call.ctx, input.deliveryId, {
        state: 'enviado',
        attempts: call.attempt,
        externalId: resposta.externalId,
        error: null,
      })
      return { externalId: resposta.externalId }
    } catch (error) {
      if (error instanceof WhatsMiauHttpError) {
        const errorCode = `api_http_${error.status}`
        if (error.status === 429) {
          await store.mark(call.ctx, input.deliveryId, {
            state: 'pendente',
            attempts: call.attempt,
            error: errorCode,
          })
          throw new ExternalNotAppliedError(errorCode, { retryAfterMs: error.retryAfterMs })
        }
        if (error.transient) {
          await store.mark(call.ctx, input.deliveryId, {
            state: 'pendente',
            attempts: call.attempt,
            error: errorCode,
          })
          // D0031: sem idempotência/reconciliação documentada pelo provedor, 408/5xx ficam incertos.
          throw new Error(errorCode, { cause: error })
        }
        await store.mark(call.ctx, input.deliveryId, {
          state: 'falhou',
          attempts: call.attempt,
          error: errorCode,
        })
        throw new PermanentJobError(errorCode)
      }
      await store.mark(call.ctx, input.deliveryId, {
        state: 'pendente',
        attempts: call.attempt,
        error: 'api_indisponivel',
      })
      throw error
    }
  },
}

/** O worker deve chamar no boot; defineExternalOperation é idempotente após reset em testes. */
export function getWhatsMiauSendOperation() {
  try {
    return getExternalOperation(DEFINITION.type) as ResolvedExternalOperation<
      SendOperationInput,
      SendOperationOutput
    >
  } catch {
    return defineExternalOperation<SendOperationInput, SendOperationOutput>(DEFINITION)
  }
}
