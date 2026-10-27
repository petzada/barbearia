import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { RequestContext } from '../../src/contracts/context'
import type {
  NotificationMessage,
  NotificationOutcome,
  NotificationProvider,
} from '../../src/contracts/ports/notification-provider'
import { createSystemContext } from '../../src/platform/context/request-context'
import { createManualClock } from '../../src/platform/time/clock'
import { parseEnv } from '../../src/platform/validation/env'
import {
  createWhatsMiauNotificationProvider,
  FakeWhatsAppProvider,
} from '../../src/integrations/whatsmiau'
import { WHATSMAIU_API_BASE_URL } from '../../src/integrations/whatsmiau/config'
import { hash, type DeliveryStore } from '../../src/integrations/whatsmiau/deliveries'
import type { DeliveryRow } from '../../src/integrations/whatsmiau/schema'

type Scenario = 'success' | 'timeout' | '429' | '5xx' | '4xx'
type Factory = (scenario: Scenario) => { provider: NotificationProvider; calls: () => number }
const SEND_SUCCESS_FIXTURE: unknown = JSON.parse(
  readFileSync(new URL('../fixtures/whatsmiau/send.success.json', import.meta.url), 'utf8'),
)

function notificationProviderContract(name: string, factory: Factory): void {
  describe(`contrato NotificationProvider (${name})`, () => {
    it('envia uma vez por chave idempotente e devolve o mesmo resultado', async () => {
      const { provider, calls } = factory('success')
      const message = mensagem('contrato-idempotente')
      const first = await provider.send(message)
      const second = await provider.send(message)
      expect(first).toMatchObject({ status: 'sent' })
      expect(second).toEqual(first)
      expect(calls()).toBe(1)
    })

    it('rejeita o reuso da chave com conteúdo diferente', async () => {
      const { provider, calls } = factory('success')
      await provider.send(mensagem('contrato-chave-reutilizada'))
      const result = await provider.send({
        ...mensagem('contrato-chave-reutilizada'),
        text: 'outro texto',
      })
      expect(result).toEqual({
        status: 'permanent_failure',
        reason: 'chave_idempotente_reutilizada',
      })
      expect(calls()).toBe(1)
    })

    it('relata a instância conectada pelo contrato de health', async () => {
      const { provider } = factory('success')
      await expect(provider.health?.('otp')).resolves.toMatchObject({
        channel: 'otp',
        connected: true,
      })
    })

    it.each([
      ['timeout', 'transient_failure'],
      ['429', 'transient_failure'],
      ['5xx', 'transient_failure'],
      ['4xx', 'permanent_failure'],
    ] as const)('classifica %s como %s', async (scenario, status) => {
      const { provider } = factory(scenario)
      const result = await provider.send(mensagem(`contrato-${scenario}`))
      expect(result.status).toBe(status)
    })
  })
}

notificationProviderContract('FakeWhatsAppProvider', (scenario) => {
  const provider = new FakeWhatsAppProvider()
  const next: Record<Scenario, NotificationOutcome> = {
    success: { status: 'sent', externalId: 'fake-ext-id' },
    timeout: { status: 'transient_failure', reason: 'timeout' },
    '429': { status: 'transient_failure', reason: 'api_http_429' },
    '5xx': { status: 'transient_failure', reason: 'api_http_503' },
    '4xx': { status: 'permanent_failure', reason: 'api_http_401' },
  }
  provider.nextOutcome = next[scenario]
  return { provider, calls: () => provider.sent.length }
})

notificationProviderContract('WhatsMiau com transporte de fixture', (scenario) => {
  const store = new MemoryDeliveryStore()
  let calls = 0
  const fetcher: typeof fetch = async (_input, init) => {
    if (init?.method === 'GET') return Response.json({ state: 'open' })
    calls += 1
    if (scenario === 'timeout') {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('timeout', 'AbortError')),
        )
      })
    }
    if (scenario === '429')
      return new Response(null, { status: 429, headers: { 'retry-after': '1' } })
    if (scenario === '5xx') return new Response(null, { status: 503 })
    if (scenario === '4xx') return new Response(null, { status: 401 })
    return Response.json(SEND_SUCCESS_FIXTURE)
  }
  const provider = createWhatsMiauNotificationProvider({
    context: contexto(),
    env: parseEnv({
      DATABASE_URL: 'postgres://fixture:fixture@localhost/barbearia_unit_test',
      BARBEARIA_SLUG: 'barbearia-unit-test',
      WHATSAPP_OTP_API_KEY: 'fixture-api-key',
      WHATSAPP_OTP_INSTANCE: 'FixtureOtp',
    }),
    fetcher,
    store,
    timeoutMs: 20,
    maxMessagesPerMinute: 100_000,
  })
  return { provider, calls: () => calls }
})

describe('protocolo HTTP WhatsMiau', () => {
  it('envia texto ao endpoint da instância com apikey e payload documentados', async () => {
    let captured:
      | { readonly url: string; readonly init: RequestInit | undefined }
      | undefined
    const provider = createWhatsMiauNotificationProvider({
      context: contexto(),
      env: parseEnv({
        DATABASE_URL: 'postgres://fixture:fixture@localhost/barbearia_unit_test',
        BARBEARIA_SLUG: 'barbearia-unit-test',
        WHATSAPP_OTP_API_KEY: 'fixture-api-key',
        WHATSAPP_OTP_INSTANCE: 'FixtureOtp',
      }),
      fetcher: async (input, init) => {
        captured = { url: String(input), init }
        return Response.json(SEND_SUCCESS_FIXTURE)
      },
      store: new MemoryDeliveryStore(),
      maxMessagesPerMinute: 100_000,
    })
    const result = await provider.send(mensagem('contrato-protocolo'))

    expect(result.status).toBe('sent')
    expect(captured?.url).toBe(`${WHATSMAIU_API_BASE_URL}/message/sendText/FixtureOtp`)
    expect(new Headers(captured?.init?.headers).get('apikey')).toBe('fixture-api-key')
    expect(JSON.parse(String(captured?.init?.body))).toEqual({
      number: '5511987654321',
      text: '123456',
    })
  })
})

function mensagem(idempotencyKey: string): NotificationMessage {
  return {
    channel: 'otp',
    toE164: '+5511987654321',
    text: '123456',
    idempotencyKey,
  }
}

function contexto(): RequestContext {
  return createSystemContext({
    barbeariaId: '018f1f0a-7bcd-7abc-8abc-123456789abc',
    clock: createManualClock('2027-01-31T15:00:00Z'),
  })
}

class MemoryDeliveryStore implements DeliveryStore {
  private readonly rows = new Map<string, DeliveryRow>()

  async createOrGet(ctx: RequestContext, input: Parameters<DeliveryStore['createOrGet']>[1]) {
    const previous = this.rows.get(input.idempotencyKey)
    if (previous) return previous
    const now = ctx.clock.now()
    const row: DeliveryRow = {
      id: `delivery-${input.idempotencyKey}`,
      barbeariaId: ctx.barbeariaId,
      canal: input.channel,
      instancia: input.instance ?? null,
      destinatarioMascarado: `${input.toE164.slice(0, 3)}*******${input.toE164.slice(-4)}`,
      telefoneHash: hash(input.toE164),
      template: null,
      chaveIdempotente: input.idempotencyKey,
      hashPayload: hash(
        JSON.stringify([input.channel, input.instance ?? null, input.toE164, input.text]),
      ),
      estado: 'pendente',
      tentativas: 0,
      idExterno: null,
      ultimoErro: null,
      criadoEm: now,
      atualizadoEm: now,
    }
    this.rows.set(input.idempotencyKey, row)
    return row
  }

  async mark(
    ctx: RequestContext,
    id: string,
    update: Parameters<DeliveryStore['mark']>[2],
  ): Promise<void> {
    const row = [...this.rows.values()].find((entry) => entry.id === id)
    if (!row) throw new Error('entrega ausente')
    this.rows.set(row.chaveIdempotente, {
      ...row,
      estado: update.state,
      ...(update.attempts === undefined ? {} : { tentativas: update.attempts }),
      ...(update.externalId === undefined ? {} : { idExterno: update.externalId }),
      ...(update.error === undefined ? {} : { ultimoErro: update.error }),
      atualizadoEm: ctx.clock.now(),
    })
  }

  async confirmByExternalId(): Promise<void> {}
}
