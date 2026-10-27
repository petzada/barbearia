import type { RequestContext } from '~/contracts/context'
import type { JsonValue } from '~/contracts/json'
import type {
  CreateRecurringInput,
  ExternalId,
  RecurringPayer,
  RecurringSnapshot,
} from '~/contracts/ports/payment-provider'
import {
  defineExternalOperation,
  runExternalOperation,
  type ExternalCallContext,
  type ExternalOperationOutcome,
} from '~/platform/external-ops'
import type { WooviFetch } from './api-client'
import { createWooviPaymentProvider, wooviConfigFromEnv } from './config'
import type { CreateImmediateChargeInput } from './payment-provider'

type JsonObject = Record<string, JsonValue>

interface CreateRecurringJson extends JsonObject {
  readonly assinaturaId: string
  readonly amountCentavos: number
  readonly startsAt: string
  readonly payer: JsonValue
}

interface RecurringRefJson extends JsonObject {
  readonly provider: string
  readonly account: string
  readonly environment: 'test' | 'prod'
  readonly id: string
}

interface RefundJson extends JsonObject {
  readonly ref: RecurringRefJson
}

interface ImmediateChargeJson extends JsonObject {
  readonly obrigacaoId: string
  readonly amountCentavos: number
}

function providerFor(call: ExternalCallContext) {
  const config = wooviConfigFromEnv()
  const fetcher: WooviFetch = (input, init) => fetch(input, { ...init, signal: call.signal })
  return createWooviPaymentProvider({ ...config, fetcher })
}

function refFromJson(ref: RecurringRefJson): ExternalId {
  return ref
}

function refToJson(ref: ExternalId): RecurringRefJson {
  return {
    provider: ref.provider,
    account: ref.account,
    environment: ref.environment,
    id: ref.id,
  }
}

function payerToJson(payer: RecurringPayer): JsonValue {
  return {
    ...(payer.name ? { name: payer.name } : {}),
    ...(payer.email ? { email: payer.email } : {}),
    ...(payer.documentNumber ? { documentNumber: payer.documentNumber } : {}),
    ...(payer.address
      ? {
          address: {
            cep: payer.address.cep,
            rua: payer.address.rua,
            numero: payer.address.numero,
            bairro: payer.address.bairro,
            cidade: payer.address.cidade,
            uf: payer.address.uf,
            ...(payer.address.complemento ? { complemento: payer.address.complemento } : {}),
          },
        }
      : {}),
  }
}

function payerFromJson(value: JsonValue): RecurringPayer | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const payer = value as JsonObject
  const rawAddress = payer.address
  const address =
    typeof rawAddress === 'object' && rawAddress !== null && !Array.isArray(rawAddress)
      ? (rawAddress as JsonObject)
      : undefined
  const stringValue = (field: JsonValue | undefined): string | undefined =>
    typeof field === 'string' ? field : undefined
  return {
    ...(stringValue(payer.name) ? { name: stringValue(payer.name) } : {}),
    ...(stringValue(payer.email) ? { email: stringValue(payer.email) } : {}),
    ...(stringValue(payer.documentNumber)
      ? { documentNumber: stringValue(payer.documentNumber) }
      : {}),
    ...(address
      ? {
          address: {
            cep: stringValue(address.cep) ?? '',
            rua: stringValue(address.rua) ?? '',
            numero: stringValue(address.numero) ?? '',
            bairro: stringValue(address.bairro) ?? '',
            cidade: stringValue(address.cidade) ?? '',
            uf: stringValue(address.uf) ?? '',
            ...(stringValue(address.complemento)
              ? { complemento: stringValue(address.complemento) }
              : {}),
          },
        }
      : {}),
  }
}

function recurringJson(value: RecurringSnapshot): JsonValue {
  return {
    ref: {
      provider: value.ref.provider,
      account: value.ref.account,
      environment: value.ref.environment,
      id: value.ref.id,
    },
    assinaturaId: value.assinaturaId,
    status: value.status,
    amountCentavos: value.amountCentavos,
    ...(value.authorizationUrl ? { authorizationUrl: value.authorizationUrl } : {}),
  }
}

export const CreateWooviRecurring = defineExternalOperation<CreateRecurringJson, JsonValue>({
  type: 'woovi.create-recurring',
  execute: async (input, call) => {
    const result = await providerFor(call).createRecurring({
      assinaturaId: input.assinaturaId,
      amountCentavos: input.amountCentavos,
      startsAt: new Date(input.startsAt),
      idempotencyKey: call.idempotencyKey,
      ...(payerFromJson(input.payer) ? { payer: payerFromJson(input.payer) } : {}),
    })
    return recurringJson(result)
  },
  reconcile: async (input, call) => {
    const result = await providerFor(call).findRecurringByReference(input.assinaturaId)
    return result
      ? { outcome: 'applied', result: recurringJson(result) }
      : { outcome: 'not_applied' }
  },
})

export const CancelWooviRecurring = defineExternalOperation<
  { readonly ref: RecurringRefJson } & JsonObject,
  JsonValue
>({
  type: 'woovi.cancel-recurring',
  execute: async (input, call) =>
    recurringJson(await providerFor(call).cancelRecurring(refFromJson(input.ref))),
  reconcile: async (input, call) => {
    const provider = providerFor(call)
    const result = await provider.getRecurring(refFromJson(input.ref))
    return result?.status === 'canceled'
      ? { outcome: 'applied', result: recurringJson(result) }
      : { outcome: 'not_applied' }
  },
})

export const ChangeWooviRecurringAmount = defineExternalOperation<
  { readonly ref: RecurringRefJson; readonly amountCentavos: number } & JsonObject,
  JsonValue
>({
  type: 'woovi.change-recurring-amount',
  execute: async (input, call) =>
    recurringJson(
      await providerFor(call).changeAmount(refFromJson(input.ref), input.amountCentavos),
    ),
  reconcile: async (input, call) => {
    const result = await providerFor(call).getRecurring(refFromJson(input.ref))
    return result?.amountCentavos === input.amountCentavos
      ? { outcome: 'applied', result: recurringJson(result) }
      : { outcome: 'not_applied' }
  },
})

export const RefundWooviPayment = defineExternalOperation<RefundJson, JsonValue>({
  type: 'woovi.refund-payment',
  execute: async (input, call) => {
    const result = await providerFor(call).refund(refFromJson(input.ref), call.idempotencyKey)
    return { refundId: result.refundId, status: result.status }
  },
})

export const CreateWooviImmediateCharge = defineExternalOperation<ImmediateChargeJson, JsonValue>({
  type: 'woovi.create-immediate-charge',
  execute: async (input, call) => {
    const result = await providerFor(call).createImmediateCharge(input)
    return {
      ref: {
        provider: result.ref.provider,
        account: result.ref.account,
        environment: result.ref.environment,
        id: result.ref.id,
      },
      status: result.status,
      amountCentavos: result.amountCentavos,
      currency: result.currency,
      approvedAt: result.approvedAt?.toISOString() ?? null,
      externalReference: result.externalReference,
    }
  },
  reconcile: async (input, call) => {
    const provider = providerFor(call)
    const config = wooviConfigFromEnv()
    const result = await provider.getPayment({
      provider: 'woovi',
      account: config.account,
      environment: config.environment,
      id: `charge:${input.obrigacaoId}`,
    })
    return result
      ? {
          outcome: 'applied',
          result: {
            ref: {
              provider: result.ref.provider,
              account: result.ref.account,
              environment: result.ref.environment,
              id: result.ref.id,
            },
            status: result.status,
            amountCentavos: result.amountCentavos,
            currency: result.currency,
            approvedAt: result.approvedAt?.toISOString() ?? null,
            externalReference: result.externalReference,
          },
        }
      : { outcome: 'not_applied' }
  },
})

export function createWooviRecurring(
  ctx: RequestContext,
  input: CreateRecurringInput,
): Promise<ExternalOperationOutcome> {
  return runExternalOperation(ctx, CreateWooviRecurring, {
    idempotencyKey: input.idempotencyKey,
    target: `assinatura:${input.assinaturaId}`,
    input: {
      assinaturaId: input.assinaturaId,
      amountCentavos: input.amountCentavos,
      startsAt: input.startsAt.toISOString(),
      payer: input.payer ? payerToJson(input.payer) : null,
    },
  })
}

export function cancelWooviRecurring(
  ctx: RequestContext,
  ref: ExternalId,
  idempotencyKey: string,
): Promise<ExternalOperationOutcome> {
  return runExternalOperation(ctx, CancelWooviRecurring, {
    idempotencyKey,
    target: `assinatura:${ref.id}`,
    input: { ref: refToJson(ref) },
  })
}

export function changeWooviRecurringAmount(
  ctx: RequestContext,
  ref: ExternalId,
  amountCentavos: number,
  idempotencyKey: string,
): Promise<ExternalOperationOutcome> {
  return runExternalOperation(ctx, ChangeWooviRecurringAmount, {
    idempotencyKey,
    target: `assinatura:${ref.id}`,
    input: { ref: refToJson(ref), amountCentavos },
  })
}

export function refundWooviPayment(
  ctx: RequestContext,
  ref: ExternalId,
  idempotencyKey: string,
): Promise<ExternalOperationOutcome> {
  return runExternalOperation(ctx, RefundWooviPayment, {
    idempotencyKey,
    target: `pagamento:${ref.id}`,
    input: { ref: refToJson(ref) },
  })
}

export function createWooviImmediateCharge(
  ctx: RequestContext,
  input: CreateImmediateChargeInput,
  idempotencyKey: string,
): Promise<ExternalOperationOutcome> {
  return runExternalOperation(ctx, CreateWooviImmediateCharge, {
    idempotencyKey,
    target: `obrigacao:${input.obrigacaoId}`,
    input: { obrigacaoId: input.obrigacaoId, amountCentavos: input.amountCentavos },
  })
}
