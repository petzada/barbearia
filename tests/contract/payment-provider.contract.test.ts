import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { ExternalId, PaymentSnapshot } from '~/contracts'
import { FakePaymentProvider } from '~/contracts/fakes'
import { WooviApiClient } from '~/integrations/woovi/api-client'
import type { WooviConfig } from '~/integrations/woovi/config'
import { WooviPaymentProvider } from '~/integrations/woovi/payment-provider'
import type { WooviFetch } from '~/integrations/woovi/api-client'
import { paymentProviderContract } from './payment-provider.contract'

const lerFixture = (nome: string): unknown =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`./fixtures/woovi/${nome}`, import.meta.url)), 'utf8'),
  ) as unknown

const wooviPaymentRef: ExternalId = {
  provider: 'woovi',
  account: 'fixture-account',
  environment: 'test',
  id: 'installment-fixture-id',
}

function fakeSubject() {
  const provider = new FakePaymentProvider()
  const fakePaymentRef: ExternalId = {
    provider: 'fake',
    account: 'fake-account',
    environment: 'test',
    id: 'installment-fixture-id',
  }
  const payment: PaymentSnapshot = {
    ref: fakePaymentRef,
    status: 'approved',
    amountCentavos: 2500,
    currency: 'BRL',
    approvedAt: new Date('2026-10-12T18:30:00.000Z'),
    externalReference: 'E0000000000000000000000000000000',
  }
  provider.payments.set(fakePaymentRef.id, payment)
  return { provider, paymentRef: fakePaymentRef }
}

function wooviSubject(fetchOverride?: WooviFetch) {
  const created = lerFixture('subscription-created.json')
  const completed = lerFixture('installment-completed.json')
  const refundResult = lerFixture('refund-completed.json')
  const recurring = new Map<string, Record<string, unknown>>()
  const refunds = new Map<string, unknown>()

  const fetcher: WooviFetch =
    fetchOverride ??
    (async (input, init) => {
      const url = new URL(String(input))
      const path = url.pathname
      if (path === '/api/v1/subscriptions' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as { correlationID: string; value: number }
        const data = JSON.parse(JSON.stringify(created)) as {
          subscription: Record<string, unknown>
        }
        data.subscription.correlationID = body.correlationID
        data.subscription.value = body.value
        data.subscription.pixRecurring = {
          ...(data.subscription.pixRecurring as Record<string, unknown>),
          status: 'CREATED',
        }
        recurring.set(body.correlationID, data.subscription)
        recurring.set(String(data.subscription.globalID), data.subscription)
        return Response.json(data)
      }
      if (path.startsWith('/api/v1/subscriptions/')) {
        const parts = path.split('/')
        const idPart =
          parts.at(-1) === 'cancel' || parts.at(-1) === 'value' ? parts.at(-2) : parts.at(-1)
        const id = decodeURIComponent(idPart ?? '')
        const target = recurring.get(id)
        if (!target) return new Response(null, { status: 404 })
        if (init?.method === 'PUT' && path.endsWith('/cancel')) {
          target.status = 'INACTIVE'
          target.pixRecurring = {
            ...(target.pixRecurring as Record<string, unknown>),
            status: 'CANCELED',
          }
        } else if (init?.method === 'PUT' && path.endsWith('/value')) {
          const body = JSON.parse(String(init.body)) as { value: number }
          target.value = body.value
        }
        return Response.json({ subscription: target })
      }
      if (path === '/api/v1/installments/installment-fixture-id') return Response.json(completed)
      if (path === '/api/v1/installments/missing-payment')
        return new Response(null, { status: 404 })
      if (path === '/api/v1/refund' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as { correlationID: string }
        const result = refunds.get(body.correlationID) ?? refundResult
        refunds.set(body.correlationID, result)
        return Response.json(result)
      }
      return new Response(null, { status: 404 })
    })
  const config: WooviConfig = {
    appId: 'fixture-app-id',
    apiBaseUrl: 'https://fixture.woovi.test',
    account: 'fixture-account',
    environment: 'test',
    subaccountId: 'fixture-subaccount',
    immediateChargeEnabled: false,
    retryPolicy: 'NON_PERMITED',
    fetcher,
  }
  const provider = new WooviPaymentProvider(
    new WooviApiClient(config.appId, config.apiBaseUrl, fetcher),
    config,
  )
  return { provider, paymentRef: wooviPaymentRef }
}

paymentProviderContract('FakePaymentProvider', fakeSubject)
paymentProviderContract('Woovi com HTTP em fixtures', wooviSubject)

describe('Woovi adapter: configuração defensiva', () => {
  it('não chama a API sem endereço e retorna erro tipado permanente', async () => {
    let chamadas = 0
    const { provider } = wooviSubject(async () => {
      chamadas += 1
      return new Response(null, { status: 404 })
    })
    await expect(
      provider.createRecurring({
        assinaturaId: 'sem-endereco',
        amountCentavos: 2500,
        startsAt: new Date('2030-01-15T12:00:00.000Z'),
        idempotencyKey: 'sem-endereco',
      }),
    ).rejects.toMatchObject({ code: 'WOOVI.PAYER_ADDRESS_REQUIRED', retryable: false })
    expect(chamadas).toBe(0)
  })

  it('deixa a cobrança imediata desligada por padrão', async () => {
    const { provider } = wooviSubject()
    await expect(
      provider.createImmediateCharge({ obrigacaoId: 'obrigacao-1', amountCentavos: 2500 }),
    ).rejects.toMatchObject({
      code: 'WOOVI.IMMEDIATE_CHARGE_DISABLED',
    })
  })
})
