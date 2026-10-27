import { createHash } from 'node:crypto'
import type { DomainEvent } from '~/contracts/events'
import type {
  ExternalId,
  PaymentEnvironment,
  PaymentSnapshot,
  RecurringSnapshot,
} from '~/contracts'
import type { RequestContext } from '~/contracts/context'

export type WooviNeutralEvent = DomainEvent & {
  readonly type:
    'ProviderRecurringStatusChanged' | 'ProviderPaymentObserved' | 'ProviderPaymentReversed'
}

function eventId(key: string): string {
  const bytes = createHash('sha1').update(`woovi:${key}`).digest().subarray(0, 16)
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function baseEvent(
  ctx: RequestContext,
  type: WooviNeutralEvent['type'],
  key: string,
  aggregateId: string,
  occurredAt: Date,
  payload: Record<string, unknown>,
): WooviNeutralEvent {
  return {
    id: eventId(`${type}:${key}`),
    type,
    version: 1,
    barbeariaId: ctx.barbeariaId,
    aggregateId,
    aggregateRevision: 1,
    occurredAt,
    correlationId: ctx.correlationId,
    payload,
  }
}

export function recurringStatusEvent(
  ctx: RequestContext,
  recurring: RecurringSnapshot,
): WooviNeutralEvent {
  return baseEvent(
    ctx,
    'ProviderRecurringStatusChanged',
    `${recurring.ref.account}:${recurring.ref.environment}:${recurring.ref.id}:${recurring.status}`,
    recurring.assinaturaId,
    ctx.clock.now(),
    { ref: recurring.ref, assinaturaId: recurring.assinaturaId, status: recurring.status },
  )
}

export function paymentObservedEvent(
  ctx: RequestContext,
  payment: PaymentSnapshot,
  status: 'approved' | 'divergent',
  assinaturaRef?: ExternalId,
): WooviNeutralEvent {
  const approvedAt = payment.approvedAt?.toISOString() ?? null
  return baseEvent(
    ctx,
    'ProviderPaymentObserved',
    `${payment.ref.account}:${payment.ref.environment}:${payment.ref.id}:${status}`,
    payment.ref.id,
    payment.approvedAt ?? ctx.clock.now(),
    {
      ref: payment.ref,
      status,
      amountCentavos: payment.amountCentavos,
      currency: payment.currency,
      approvedAt,
      externalReference: payment.externalReference,
      ...(assinaturaRef ? { assinaturaRef } : {}),
    },
  )
}

export function paymentReversedEvent(
  ctx: RequestContext,
  payment: PaymentSnapshot,
): WooviNeutralEvent {
  return baseEvent(
    ctx,
    'ProviderPaymentReversed',
    `${payment.ref.account}:${payment.ref.environment}:${payment.ref.id}:reversed`,
    payment.ref.id,
    ctx.clock.now(),
    {
      ref: payment.ref,
      amountCentavos: payment.amountCentavos,
      externalReference: payment.externalReference,
    },
  )
}

export function externalRef(
  account: string,
  environment: PaymentEnvironment,
  id: string,
): ExternalId {
  return { provider: 'woovi', account, environment, id }
}
