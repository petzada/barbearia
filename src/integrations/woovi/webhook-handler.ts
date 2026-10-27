import type { RequestContext } from '~/contracts/context'
import type { ExternalId } from '~/contracts/ports/payment-provider'
import type { InboxRecord } from '~/platform/inbox'
import { getDatabase } from '~/platform/db'
import type { Db } from '~/platform/db'
import { PermanentJobError } from '~/platform/jobs'
import { drizzleOutbox } from '~/platform/outbox'
import type { WooviConfig } from './config'
import { paymentObservedEvent, paymentReversedEvent, recurringStatusEvent } from './events'
import type { WooviNeutralEvent } from './events'
import type { WooviPaymentProvider } from './payment-provider'

type Obj = Record<string, unknown>

function object(value: unknown): Obj {
  return typeof value === 'object' && value !== null ? (value as Obj) : {}
}

function string(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

function nestedObject(root: unknown, keys: readonly string[]): Obj | undefined {
  const visit = (value: unknown): Obj | undefined => {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = visit(item)
        if (found) return found
      }
      return undefined
    }
    const current = object(value)
    for (const key of keys) {
      const candidate = current[key]
      if (candidate && typeof candidate === 'object') return object(candidate)
    }
    for (const candidate of Object.values(current)) {
      const found = visit(candidate)
      if (found) return found
    }
    return undefined
  }
  return visit(root)
}

function paymentRef(
  payment: Obj,
  isCharge: boolean,
  config: Pick<WooviConfig, 'account' | 'environment'>,
): ExternalId | undefined {
  const id =
    string(payment.globalID) ??
    string(payment.id) ??
    string(payment.identifier) ??
    string(payment.correlationID) ??
    string(payment.endToEndId)
  if (!id) return undefined
  return {
    provider: 'woovi',
    account: config.account,
    environment: config.environment,
    id: isCharge ? `charge:${id}` : id,
  }
}

export interface ProcessWooviWebhookDeps {
  readonly db?: Db
}

/** Webhook é só pista: consulta estado atual da Woovi antes de publicar eventos neutros. */
export async function processWooviWebhook(
  record: InboxRecord,
  ctx: RequestContext,
  provider: WooviPaymentProvider,
  config: WooviConfig,
  deps: ProcessWooviWebhookDeps = {},
): Promise<void> {
  if (
    record.provider !== 'woovi' ||
    record.account !== config.account ||
    record.environment !== config.environment
  ) {
    throw new PermanentJobError('O webhook não pertence à conta e ao ambiente Woovi configurados.')
  }

  let payload: unknown
  try {
    payload = JSON.parse(record.body) as unknown
  } catch (error) {
    throw new PermanentJobError('O registro do webhook Woovi contém JSON inválido.', {
      cause: error,
    })
  }
  const subscriptionHint = nestedObject(payload, ['subscription'])
  const subscriptionCorrelation =
    string(subscriptionHint?.correlationID) ??
    string(object(payload).correlationID) ??
    string(object(object(payload).data).correlationID)
  const subscriptionId =
    string(subscriptionHint?.globalID) ??
    string(subscriptionHint?.id) ??
    string(object(payload).paymentSubscriptionGlobalID)

  let recurring = null
  if (subscriptionId) {
    recurring = await provider.getRecurring({
      provider: 'woovi',
      account: config.account,
      environment: config.environment,
      id: subscriptionId,
    })
  } else if (subscriptionCorrelation) {
    recurring = await provider.findRecurringByReference(subscriptionCorrelation)
  }

  const events: WooviNeutralEvent[] = []
  if (recurring && ['authorized', 'canceled', 'refused'].includes(recurring.status)) {
    events.push(recurringStatusEvent(ctx, recurring))
  }

  const chargeHint = nestedObject(payload, ['charge'])
  const installmentHint = nestedObject(payload, ['installment', 'cobr', 'payment'])
  const isCharge = Boolean(chargeHint && !installmentHint)
  const payHint = isCharge ? chargeHint : installmentHint
  const paymentReference = payHint ? paymentRef(payHint, isCharge, config) : undefined
  if (paymentReference) {
    const payment = await provider.getPayment(paymentReference)
    if (payment?.status === 'reversed') {
      events.push(paymentReversedEvent(ctx, payment))
    } else if (payment?.status === 'approved') {
      if (!payment.approvedAt) {
        throw new PermanentJobError(
          'A cobrança liquidada não contém instante de aprovação da Woovi.',
        )
      }
      const divergent = recurring !== null && payment.amountCentavos !== recurring.amountCentavos
      events.push(
        paymentObservedEvent(ctx, payment, divergent ? 'divergent' : 'approved', recurring?.ref),
      )
    }
  }

  if (events.length === 0) return
  const db = deps.db ?? getDatabase()
  await db.transaction(async (tx) => {
    for (const event of events) await drizzleOutbox.publishInTx(tx, event)
  })
}
