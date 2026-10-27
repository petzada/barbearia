import { createHmac, timingSafeEqual, verify as verifySignature } from 'node:crypto'
import { sha256Hex } from '~/platform/inbox'
import type { VerifyResult, WebhookAdapter, WebhookInput } from '~/platform/inbox'
import type { WooviConfig } from './config'
import type { WooviPaymentProvider } from './payment-provider'

type Obj = Record<string, unknown>

function object(value: unknown): Obj {
  return typeof value === 'object' && value !== null ? (value as Obj) : {}
}

function keysFrom(value: unknown): string[] {
  if (typeof value === 'string') return value.includes('BEGIN PUBLIC KEY') ? [value] : []
  if (Array.isArray(value)) return value.flatMap(keysFrom)
  const record = object(value)
  return [
    record.publicKey,
    record.public_key,
    record.key,
    record.value,
    ...Object.values(record),
  ].flatMap(keysFrom)
}

function normalizedSignature(value: string): string {
  return value.replace(/^sha256=/i, '').trim()
}

function compareHmac(rawBody: string, secret: string, signature: string): boolean {
  const expected = createHmac('sha256', secret).update(rawBody).digest()
  const normalized = normalizedSignature(signature)
  const candidates = [Buffer.from(normalized, 'hex'), Buffer.from(normalized, 'base64')]
  return candidates.some(
    (candidate) => candidate.length === expected.length && timingSafeEqual(candidate, expected),
  )
}

export class WooviWebhookAdapter implements WebhookAdapter {
  readonly provider = 'woovi'
  private cachedPublicKeys: readonly string[] | undefined
  private cachedAt = 0

  constructor(
    private readonly client: WooviPaymentProvider['client'],
    private readonly config: Pick<
      WooviConfig,
      'account' | 'environment' | 'webhookHmacSecret' | 'webhookPublicKeys'
    >,
    private readonly now: () => number = Date.now,
  ) {}

  async verify(input: WebhookInput): Promise<VerifyResult> {
    const rsaSignature = input.headers.get('x-webhook-signature')
    if (rsaSignature) {
      const keys = await this.publicKeys()
      const assinatura = Buffer.from(normalizedSignature(rsaSignature), 'base64')
      const body = Buffer.from(input.rawBody, 'utf8')
      const valid = keys.some((key) => {
        try {
          return verifySignature('RSA-SHA256', body, key, assinatura)
        } catch {
          return false
        }
      })
      return valid ? { ok: true } : { ok: false, reason: 'assinatura RSA inválida' }
    }

    const hmacSignature = input.headers.get('x-openpix-signature')
    if (hmacSignature && this.config.webhookHmacSecret) {
      return compareHmac(input.rawBody, this.config.webhookHmacSecret, hmacSignature)
        ? { ok: true }
        : { ok: false, reason: 'assinatura HMAC inválida' }
    }
    return { ok: false, reason: 'assinatura ausente' }
  }

  parse(input: WebhookInput) {
    let payload: unknown
    try {
      payload = JSON.parse(input.rawBody) as unknown
    } catch (error) {
      throw new Error('Corpo JSON inválido.', { cause: error })
    }
    const root = object(payload)
    const data = object(root.data)
    const eventId =
      (typeof root.eventID === 'string' && root.eventID) ||
      (typeof root.eventId === 'string' && root.eventId) ||
      (typeof root.webhookId === 'string' && root.webhookId) ||
      (typeof root.id === 'string' && root.id) ||
      (typeof data.eventID === 'string' && data.eventID) ||
      sha256Hex(input.rawBody)
    const requestId = input.headers.get('x-request-id')
    return {
      account: this.config.account,
      environment: this.config.environment,
      eventId,
      ...(requestId ? { headers: { 'x-request-id': requestId } } : {}),
    }
  }

  private async publicKeys(): Promise<readonly string[]> {
    if (this.config.webhookPublicKeys) return this.config.webhookPublicKeys
    if (this.cachedPublicKeys && this.now() - this.cachedAt < 60 * 60 * 1000) {
      return this.cachedPublicKeys
    }
    const response = await this.client.request<unknown>('/api/v1/webhook/public-keys')
    const keys = keysFrom(response)
    if (keys.length === 0)
      throw new Error('A Woovi não retornou chaves públicas de webhook válidas.')
    this.cachedPublicKeys = keys
    this.cachedAt = this.now()
    return keys
  }
}

export function createWooviWebhookAdapter(
  provider: WooviPaymentProvider,
  config: WooviConfig,
): WooviWebhookAdapter {
  return new WooviWebhookAdapter(provider.client, config)
}
