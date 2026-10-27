import { createHash } from 'node:crypto'
import {
  PAYMENT_CAPABILITY_KEYS,
  type CreateRecurringInput,
  type ExternalId,
  type PaymentCapabilities,
  type PaymentProvider,
  type PaymentSnapshot,
  type RecurringSnapshot,
  type RecurringStatus,
  type RefundResult,
} from '~/contracts'
import { PermanentJobError } from '~/platform/jobs'
import type { WooviApiClient } from './api-client'
import { WooviErrors } from './errors'
import type { WooviConfig } from './config'

type Obj = Record<string, unknown>

const CAPACIDADES_NAO_VERIFICADAS: PaymentCapabilities = Object.fromEntries(
  PAYMENT_CAPABILITY_KEYS.map((chave) => [chave, 'nao_verificado' as const]),
) as PaymentCapabilities

function objeto(value: unknown): Obj {
  return typeof value === 'object' && value !== null ? (value as Obj) : {}
}

function texto(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function inteiro(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : undefined
}

function unwrap(value: unknown, key: string): Obj {
  const root = objeto(value)
  return objeto(root[key] ?? root)
}

function estadoRecorrencia(value: unknown): RecurringStatus {
  const assinatura = objeto(value)
  const pix = objeto(assinatura.pixRecurring)
  const status = (texto(pix.status) ?? texto(assinatura.status) ?? '').toUpperCase()
  if (status === 'APPROVED' || status === 'ACTIVE') return 'authorized'
  if (status === 'CANCELED' || status === 'INACTIVE' || status === 'EXPIRED') return 'canceled'
  if (status === 'REJECTED') return 'refused'
  if (status === 'PAUSED') return 'paused'
  return 'pending'
}

function snapshotRecorrencia(
  response: unknown,
  config: WooviConfig,
  assinaturaFallback?: string,
): RecurringSnapshot {
  const assinatura = unwrap(response, 'subscription')
  const recurring = objeto(assinatura.pixRecurring)
  const customer = objeto(assinatura.customer)
  const ref =
    texto(assinatura.globalID) ??
    texto(assinatura.id) ??
    texto(assinatura.correlationID) ??
    assinaturaFallback
  const assinaturaId = texto(assinatura.correlationID) ?? assinaturaFallback
  const amountCentavos = inteiro(assinatura.value)
  if (!ref || !assinaturaId || amountCentavos === undefined) {
    throw new Error('A Woovi retornou uma assinatura sem os campos necessários.')
  }
  const authorizationUrl = texto(assinatura.paymentLinkUrl) ?? texto(recurring.paymentLinkUrl)
  return {
    ref: {
      provider: 'woovi',
      account: config.account,
      environment: config.environment,
      id: ref,
    },
    assinaturaId,
    status: estadoRecorrencia({ ...assinatura, pixRecurring: recurring, customer }),
    amountCentavos,
    ...(authorizationUrl ? { authorizationUrl } : {}),
  }
}

function approvedInstant(installment: Obj, cobr: Obj): Date | null {
  const tries = Array.isArray(cobr.tries) ? cobr.tries.map(objeto) : []
  const tentativaLiquidada = [...tries].reverse().find((item) => {
    const status = (texto(item.status) ?? '').toUpperCase()
    return status === 'COMPLETED' || status === 'PAID'
  })
  const candidates = [
    cobr.updatedAt,
    cobr.completedAt,
    tentativaLiquidada?.updatedAt,
    installment.completedAt,
    installment.updatedAt,
  ]
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue
    const date = new Date(candidate)
    if (!Number.isNaN(date.getTime())) return date
  }
  return null
}

function snapshotPagamento(
  response: unknown,
  config: WooviConfig,
  idFallback: string,
  resource: 'installment' | 'charge',
): PaymentSnapshot {
  const pagamento = unwrap(response, resource)
  const cobr = objeto(pagamento.cobr)
  const pix = objeto(pagamento.pix)
  const rawStatus = (
    texto(cobr.status) ??
    texto(pagamento.status) ??
    texto(pagamento.transactionStatus) ??
    ''
  ).toUpperCase()
  const status =
    rawStatus === 'COMPLETED' || rawStatus === 'PAID' || rawStatus === 'CONCLUIDA'
      ? 'approved'
      : rawStatus === 'REFUNDED' || rawStatus === 'REVERSED' || rawStatus === 'DEVOLVIDA'
        ? 'reversed'
        : rawStatus === 'EXPIRED' || rawStatus === 'CANCELED' || rawStatus === 'REJECTED'
          ? 'refused'
          : 'pending'
  const amountCentavos = inteiro(pagamento.value) ?? inteiro(cobr.value) ?? 0
  const paymentId =
    texto(pagamento.globalID) ??
    texto(pagamento.id) ??
    texto(pagamento.identifier) ??
    texto(pagamento.correlationID) ??
    idFallback
  const externalReference =
    texto(cobr.endToEndId) ??
    texto(pix.endToEndId) ??
    texto(pagamento.endToEndId) ??
    texto(pagamento.transactionEndToEndId) ??
    null
  return {
    ref: {
      provider: 'woovi',
      account: config.account,
      environment: config.environment,
      id: resource === 'charge' ? `charge:${paymentId}` : paymentId,
    },
    status,
    amountCentavos,
    currency: 'BRL',
    approvedAt: status === 'approved' ? approvedInstant(pagamento, cobr) : null,
    externalReference,
  }
}

function validarValor(amountCentavos: number): void {
  if (!Number.isSafeInteger(amountCentavos) || amountCentavos <= 0) {
    throw new RangeError('O valor da cobrança precisa ser um inteiro positivo em centavos.')
  }
}

export interface CreateImmediateChargeInput {
  readonly obrigacaoId: string
  readonly amountCentavos: number
}

/** Adapter Woovi para a porta comum. Efeitos duráveis são expostos também por `operations.ts`. */
export class WooviPaymentProvider implements PaymentProvider {
  readonly id = 'woovi'
  readonly capabilities = CAPACIDADES_NAO_VERIFICADAS
  readonly receiverDisplayName: string | undefined

  constructor(
    readonly client: WooviApiClient,
    private readonly config: WooviConfig,
  ) {
    this.receiverDisplayName = config.receiverDisplayName
  }

  async createRecurring(input: CreateRecurringInput): Promise<RecurringSnapshot> {
    validarValor(input.amountCentavos)
    const address = input.payer?.address
    if (!address) throw WooviErrors.PAYER_ADDRESS_REQUIRED()

    const existente = await this.findRecurringByReference(input.assinaturaId)
    if (existente) return existente

    const customer = {
      ...(input.payer.name ? { name: input.payer.name } : {}),
      ...(input.payer.email ? { email: input.payer.email } : {}),
      ...(input.payer.documentNumber ? { taxID: input.payer.documentNumber } : {}),
      address: {
        zipcode: address.cep,
        street: address.rua,
        number: address.numero,
        neighborhood: address.bairro,
        city: address.cidade,
        state: address.uf,
        ...(address.complemento ? { complement: address.complemento } : {}),
      },
    }
    const response = await this.client.request<unknown>('/api/v1/subscriptions', {
      method: 'POST',
      body: {
        correlationID: input.assinaturaId,
        value: input.amountCentavos,
        customer,
        type: 'PIX_RECURRING',
        frequency: 'MONTHLY',
        dayGenerateCharge: input.startsAt.toISOString(),
        pixRecurringOptions: {
          journey: 'ONLY_RECURRENCY',
          retryPolicy: this.config.retryPolicy,
        },
      },
    })
    if (!response) throw new Error('A Woovi não retornou a assinatura criada.')
    return snapshotRecorrencia(response, this.config, input.assinaturaId)
  }

  async getRecurring(ref: ExternalId): Promise<RecurringSnapshot | null> {
    this.assertReference(ref)
    const response = await this.client.request<unknown>(
      `/api/v1/subscriptions/${encodeURIComponent(ref.id)}`,
      { allowNotFound: true },
    )
    return response ? snapshotRecorrencia(response, this.config) : null
  }

  async findRecurringByReference(assinaturaId: string): Promise<RecurringSnapshot | null> {
    const response = await this.client.request<unknown>(
      `/api/v1/subscriptions/${encodeURIComponent(assinaturaId)}`,
      { allowNotFound: true },
    )
    return response ? snapshotRecorrencia(response, this.config, assinaturaId) : null
  }

  async cancelRecurring(ref: ExternalId): Promise<RecurringSnapshot> {
    this.assertReference(ref)
    const response = await this.client.request<unknown>(
      `/api/v1/subscriptions/${encodeURIComponent(ref.id)}/cancel`,
      { method: 'PUT', body: {} },
    )
    if (!response) throw new Error('A Woovi não confirmou o cancelamento da assinatura.')
    try {
      return snapshotRecorrencia(response, this.config)
    } catch {
      const atualizada = await this.getRecurring(ref)
      if (atualizada) return atualizada
      throw new Error('A Woovi não retornou a assinatura cancelada.')
    }
  }

  async changeAmount(ref: ExternalId, amountCentavos: number): Promise<RecurringSnapshot> {
    this.assertReference(ref)
    validarValor(amountCentavos)
    const response = await this.client.request<unknown>(
      `/api/v1/subscriptions/${encodeURIComponent(ref.id)}/value`,
      { method: 'PUT', body: { value: amountCentavos } },
    )
    if (!response) throw new Error('A Woovi não confirmou a alteração do valor.')
    return snapshotRecorrencia(response, this.config)
  }

  async getPayment(ref: ExternalId): Promise<PaymentSnapshot | null> {
    this.assertReference(ref)
    const isCharge = ref.id.startsWith('charge:')
    const id = isCharge ? ref.id.slice('charge:'.length) : ref.id
    const path = isCharge
      ? `/api/v1/charge/${encodeURIComponent(id)}`
      : `/api/v1/installments/${encodeURIComponent(id)}`
    const response = await this.client.request<unknown>(path, { allowNotFound: true })
    return response
      ? snapshotPagamento(response, this.config, id, isCharge ? 'charge' : 'installment')
      : null
  }

  async refund(ref: ExternalId, idempotencyKey: string): Promise<RefundResult> {
    this.assertReference(ref)
    const payment = await this.getPayment(ref)
    if (!payment?.externalReference) {
      throw new PermanentJobError('A cobrança Woovi não tem endToEndId disponível para devolução.')
    }
    const response = await this.client.request<unknown>('/api/v1/refund', {
      method: 'POST',
      body: {
        transactionEndToEndId: payment.externalReference,
        correlationID: idempotencyKey,
      },
    })
    const reembolso = unwrap(response, 'refund')
    const refundId = texto(reembolso.refundId) ?? texto(reembolso.id) ?? idempotencyKey
    const state = (texto(reembolso.status) ?? '').toUpperCase()
    const status: RefundResult['status'] =
      state === 'COMPLETED' || state === 'COMPLETED_REFUND'
        ? 'completed'
        : state === 'FAILED' || state === 'ERROR'
          ? 'failed'
          : 'processing'
    return { refundId, status }
  }

  /** Cobrança Pix de regularização D0086: correlação é a mesma obrigação e a subconta é explícita. */
  async createImmediateCharge(input: CreateImmediateChargeInput): Promise<PaymentSnapshot> {
    if (!this.config.immediateChargeEnabled) {
      throw WooviErrors.IMMEDIATE_CHARGE_DISABLED()
    }
    if (!this.config.subaccountId) throw WooviErrors.SUBACCOUNT_REQUIRED()
    validarValor(input.amountCentavos)
    const response = await this.client.request<unknown>('/api/v1/charge', {
      method: 'POST',
      body: {
        correlationID: input.obrigacaoId,
        value: input.amountCentavos,
        subaccount: this.config.subaccountId,
      },
    })
    if (!response) throw new Error('A Woovi não retornou a cobrança Pix criada.')
    return snapshotPagamento(response, this.config, input.obrigacaoId, 'charge')
  }

  private assertReference(ref: ExternalId): void {
    if (
      ref.provider !== this.id ||
      ref.account !== this.config.account ||
      ref.environment !== this.config.environment
    ) {
      throw new RangeError('O identificador externo pertence a outra conta ou ambiente.')
    }
  }
}

/** Hash estável para correlação segura sem registrar o AppID em identificadores externos. */
export function wooviAccountId(appId: string): string {
  return createHash('sha256').update(appId).digest('hex').slice(0, 20)
}
