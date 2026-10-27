import { createHmac, generateKeyPairSync, sign } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WooviApiClient, type WooviFetch } from '~/integrations/woovi/api-client'
import type { WooviConfig } from '~/integrations/woovi/config'
import { WooviPaymentProvider } from '~/integrations/woovi/payment-provider'
import { processWooviWebhook } from '~/integrations/woovi/webhook-handler'
import { WooviWebhookAdapter } from '~/integrations/woovi/webhook'
import type { RequestContext } from '~/contracts/context'
import type { InboxRecord } from '~/platform/inbox'
import { createManualClock } from '~/platform/time'

const publicado = vi.hoisted(() => ({ events: [] as unknown[] }))

vi.mock('~/platform/db', () => ({
  getDatabase: () => ({ transaction: async (run: (tx: object) => Promise<unknown>) => run({}) }),
}))

vi.mock('~/platform/outbox', () => ({
  drizzleOutbox: {
    publishInTx: async (_tx: object, event: unknown) => {
      publicado.events.push(event)
    },
  },
}))

const config: WooviConfig = {
  appId: 'fixture-app-id',
  apiBaseUrl: 'https://fixture.woovi.test',
  account: 'fixture-account',
  environment: 'test',
  subaccountId: 'fixture-subaccount',
  immediateChargeEnabled: false,
  retryPolicy: 'NON_PERMITED',
  webhookPublicKeys: [],
}

function makeSignatureFixture() {
  const keys = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  const provider = new WooviPaymentProvider(
    new WooviApiClient(config.appId, config.apiBaseUrl, async () => Response.json({})),
    config,
  )
  return {
    keys,
    adapter: new WooviWebhookAdapter(provider.client, {
      ...config,
      webhookPublicKeys: [keys.publicKey],
    }),
  }
}

function testContext(): RequestContext {
  return {
    barbeariaId: 'barbearia-fixture',
    actorKind: 'system',
    actorId: null,
    roles: [],
    sessionId: null,
    authTime: null,
    correlationId: 'corr-fixture-001',
    clock: createManualClock(new Date('2026-10-13T12:00:00.000Z')),
  }
}

function record(body: string, eventId = 'event-fixture-01'): InboxRecord {
  return {
    id: 'inbox-fixture-01',
    provider: 'woovi',
    account: config.account,
    environment: config.environment,
    externalEventId: eventId,
    body,
    headers: {},
    receivedAt: new Date('2026-10-13T12:00:00.000Z'),
  }
}

function makeProvider(state: { subscription: string; payment: string; amount?: number }) {
  const fetcher: WooviFetch = async (input) => {
    const path = new URL(String(input)).pathname
    if (path === '/api/v1/subscriptions/sub-global-id') {
      const cancelled = state.subscription === 'CANCELED'
      return Response.json({
        subscription: {
          globalID: 'sub-global-id',
          correlationID: 'assinatura-fixture-01',
          value: 2500,
          status: cancelled ? 'INACTIVE' : 'ACTIVE',
          pixRecurring: { status: state.subscription },
        },
      })
    }
    if (path === '/api/v1/installments/installment-fixture-id') {
      return Response.json({
        installment: {
          id: 'installment-fixture-id',
          value: state.amount ?? 2500,
          status: state.payment,
          cobr: {
            status: state.payment,
            endToEndId: 'E0000000000000000000000000000000',
            updatedAt: '2026-10-12T18:30:00.000Z',
            tries: [{ status: state.payment, updatedAt: '2026-10-12T18:30:00.000Z' }],
          },
        },
      })
    }
    return new Response(null, { status: 404 })
  }
  const paymentProvider = new WooviPaymentProvider(
    new WooviApiClient(config.appId, config.apiBaseUrl, fetcher),
    config,
  )
  return paymentProvider
}

function eventPayload(): string {
  return JSON.stringify({
    event: 'PIX_AUTOMATIC_COBR_COMPLETED',
    eventID: 'event-fixture-01',
    subscription: {
      globalID: 'sub-global-id',
      correlationID: 'assinatura-fixture-01',
    },
    installment: { id: 'installment-fixture-id' },
  })
}

describe('Woovi webhook signature', () => {
  it('verifica RSA sobre o corpo bruto e rejeita uma assinatura inválida', async () => {
    const { keys, adapter } = makeSignatureFixture()
    const rawBody = '{"eventID":"rsa-fixture"}'
    const signature = sign('RSA-SHA256', Buffer.from(rawBody), keys.privateKey).toString('base64')
    const valid = await adapter.verify({
      rawBody,
      headers: new Headers({ 'x-webhook-signature': signature }),
      url: new URL('https://barbearia.test/api/webhooks/woovi'),
    })
    const invalid = await adapter.verify({
      rawBody,
      headers: new Headers({ 'x-webhook-signature': 'not-a-signature' }),
      url: new URL('https://barbearia.test/api/webhooks/woovi'),
    })
    expect(valid).toEqual({ ok: true })
    expect(invalid.ok).toBe(false)
    expect(
      adapter.parse({
        rawBody,
        headers: new Headers(),
        url: new URL('https://barbearia.test/api/webhooks/woovi'),
      }).eventId,
    ).toBe('rsa-fixture')
  })

  it('aceita HMAC apenas quando há segredo configurado', async () => {
    const provider = new WooviPaymentProvider(
      new WooviApiClient(config.appId, config.apiBaseUrl, async () => Response.json({})),
      config,
    )
    const secret = 'fixture-webhook-secret'
    const adapter = new WooviWebhookAdapter(provider.client, {
      ...config,
      webhookHmacSecret: secret,
    })
    const rawBody = '{"eventID":"hmac-fixture"}'
    const signature = createHmac('sha256', secret).update(rawBody).digest('hex')
    expect(
      await adapter.verify({
        rawBody,
        headers: new Headers({ 'x-openpix-signature': signature }),
        url: new URL('https://barbearia.test/api/webhooks/woovi'),
      }),
    ).toEqual({ ok: true })
  })
})

describe('Woovi webhook consulta a API antes de emitir eventos', () => {
  beforeEach(() => {
    publicado.events.length = 0
  })

  it('autorização sem cobrança não publica evento de pagamento', async () => {
    const provider = makeProvider({ subscription: 'APPROVED', payment: 'REJECTED' })
    const body = JSON.stringify({
      event: 'PIX_AUTOMATIC_AUTHORIZED',
      eventID: 'authorization-only',
      subscription: { globalID: 'sub-global-id' },
    })
    await processWooviWebhook(record(body), testContext(), provider, config)
    expect(publicado.events).toHaveLength(1)
    expect(publicado.events[0]).toMatchObject({ type: 'ProviderRecurringStatusChanged' })
  })

  it('eventos fora de ordem consultam o estado atual e preservam idempotência do evento', async () => {
    const provider = makeProvider({ subscription: 'CANCELED', payment: 'REJECTED' })
    const first = JSON.stringify({
      event: 'PIX_AUTOMATIC_AUTHORIZED',
      eventID: 'old-authorized-event',
      subscription: { globalID: 'sub-global-id' },
    })
    const stale = JSON.stringify({
      event: 'PIX_AUTOMATIC_CREATED',
      eventID: 'newer-delivery-of-old-state',
      subscription: { globalID: 'sub-global-id' },
    })
    await processWooviWebhook(record(first), testContext(), provider, config)
    await processWooviWebhook(record(stale), testContext(), provider, config)
    expect(publicado.events).toHaveLength(2)
    expect(publicado.events[0]).toMatchObject({
      type: 'ProviderRecurringStatusChanged',
      payload: { status: 'canceled' },
    })
    expect(publicado.events[1]).toMatchObject({ id: (publicado.events[0] as { id: string }).id })
  })

  it('uma tentativa recusada não vira pagamento; a liquidação posterior usa o instante do provedor', async () => {
    const state = { subscription: 'APPROVED', payment: 'REJECTED' }
    const provider = makeProvider(state)
    await processWooviWebhook(
      record(eventPayload(), 'rejected-attempt'),
      testContext(),
      provider,
      config,
    )
    expect(publicado.events).toHaveLength(1)
    expect(publicado.events[0]).toMatchObject({ type: 'ProviderRecurringStatusChanged' })

    publicado.events.length = 0
    state.payment = 'COMPLETED'
    await processWooviWebhook(
      record(eventPayload(), 'settled-attempt'),
      testContext(),
      provider,
      config,
    )
    expect(publicado.events).toHaveLength(2)
    const observed = publicado.events.find(
      (event) => (event as { type: string }).type === 'ProviderPaymentObserved',
    ) as { id: string; payload: { status: string; approvedAt: string } }
    expect(observed.payload).toMatchObject({
      status: 'approved',
      approvedAt: '2026-10-12T18:30:00.000Z',
    })

    publicado.events.length = 0
    await processWooviWebhook(
      record(eventPayload(), 'duplicate-settlement'),
      testContext(),
      provider,
      config,
    )
    const repeated = publicado.events.find(
      (event) => (event as { type: string }).type === 'ProviderPaymentObserved',
    ) as { id: string }
    expect(repeated.id).toBe(observed.id)
  })

  it('marca como divergente o valor pago diferente do autorizado', async () => {
    const provider = makeProvider({ subscription: 'APPROVED', payment: 'COMPLETED', amount: 2600 })
    await processWooviWebhook(record(eventPayload()), testContext(), provider, config)
    expect(publicado.events).toContainEqual(
      expect.objectContaining({
        type: 'ProviderPaymentObserved',
        payload: expect.objectContaining({ status: 'divergent' }),
      }),
    )
  })
})
