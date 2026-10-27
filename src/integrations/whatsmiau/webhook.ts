import { timingSafeEqual } from 'node:crypto'
import type { Env } from '~/platform/validation/env'
import type { ParsedWebhook, WebhookAdapter, WebhookInput } from '~/platform/inbox/receive'
import { loadEnv } from '~/platform/validation/env'
import { hash, validE164 } from './deliveries'

export const WHATSMAIU_INBOX_PROVIDER = 'whatsmiau'

export function createWhatsMiauWebhookAdapter(env: Env = loadEnv()): WebhookAdapter {
  return {
    provider: WHATSMAIU_INBOX_PROVIDER,
    verify: ({ headers }) => {
      const expected = env.WHATSAPP_WEBHOOK_TOKEN
      const received = headers.get('authorization')
      return expected && received && tokenMatches(expected, received)
        ? { ok: true }
        : { ok: false, reason: 'token-invalido' }
    },
    parse: parseWebhook,
  }
}

export interface ParsedWhatsMiauEnvelope {
  readonly event: string
  readonly instance: string
  readonly data: Record<string, unknown>
  readonly dateTime: string | undefined
}

export function parseWhatsMiauEnvelope(rawBody: string): ParsedWhatsMiauEnvelope {
  const body: unknown = JSON.parse(rawBody)
  if (!isRecord(body)) throw new Error('envelope inválido')
  const event = body['event']
  const instance = body['instance']
  const data = body['data']
  const dateTime = body['date_time']
  if (typeof event !== 'string' || event.length === 0) throw new Error('evento ausente')
  if (typeof instance !== 'string' || instance.length === 0) throw new Error('instância ausente')
  if (!isRecord(data)) throw new Error('dados do evento ausentes')
  return {
    event,
    instance,
    data,
    dateTime: typeof dateTime === 'string' ? dateTime : undefined,
  }
}

export function parseInboundMessage(rawBody: string):
  | {
      readonly telefoneE164: string
      readonly texto: string
      readonly textoNormalizado: string
      readonly recebidoEm: Date
      readonly instancia: string
    }
  | undefined {
  const envelope = parseWhatsMiauEnvelope(rawBody)
  if (envelope.event !== 'messages.upsert') return undefined
  const key = envelope.data['key']
  const message = envelope.data['message']
  if (!isRecord(key) || !isRecord(message) || key['fromMe'] !== false) return undefined
  const remoteJid = key['remoteJid']
  if (typeof remoteJid !== 'string') return undefined
  const match = /^(\d{8,15})(?::\d+)?@s\.whatsapp\.net$/.exec(remoteJid)
  const telefoneE164 = match?.[1] ? `+${match[1]}` : undefined
  if (!telefoneE164 || !validE164(telefoneE164)) return undefined
  const texto = textoDaMensagem(message)?.trim()
  if (!texto) return undefined
  const recebidoEm = instanteDaMensagem(envelope.data['messageTimestamp'], envelope.dateTime)
  if (!recebidoEm) throw new Error('instante da mensagem ausente ou inválido')
  return {
    telefoneE164,
    texto,
    textoNormalizado: texto.toLocaleUpperCase('pt-BR'),
    recebidoEm,
    instancia: envelope.instance,
  }
}

export function parseDeliveryUpdate(rawBody: string):
  | {
      readonly instance: string
      readonly externalId: string
      readonly status: string
    }
  | undefined {
  const envelope = parseWhatsMiauEnvelope(rawBody)
  if (envelope.event !== 'messages.update' || envelope.data['fromMe'] !== true) return undefined
  const externalId = envelope.data['messageId'] ?? envelope.data['keyId']
  const status = envelope.data['status']
  if (typeof externalId !== 'string' || typeof status !== 'string') return undefined
  return { instance: envelope.instance, externalId, status }
}

function parseWebhook(input: WebhookInput): ParsedWebhook {
  const envelope = parseWhatsMiauEnvelope(input.rawBody)
  const eventId = eventIdFor(envelope.event, envelope.data, input.rawBody)
  return {
    account: envelope.instance,
    environment: 'cloud',
    eventId,
    headers: { event: envelope.event, instance: envelope.instance },
  }
}

function eventIdFor(event: string, data: Record<string, unknown>, rawBody: string): string {
  if (event === 'messages.upsert') {
    const key = data['key']
    if (isRecord(key) && typeof key['id'] === 'string' && key['id'] !== '') return key['id']
  }
  if (event === 'messages.update') {
    const externalId = data['messageId'] ?? data['keyId']
    const status = data['status']
    if (typeof externalId === 'string' && typeof status === 'string')
      return `${externalId}:${status}`
  }
  return `${event}:${hash(rawBody)}`
}

function textoDaMensagem(message: Record<string, unknown>): string | undefined {
  const candidates = [
    message['conversation'],
    isRecord(message['extendedTextMessage']) ? message['extendedTextMessage']['text'] : undefined,
    isRecord(message['imageMessage']) ? message['imageMessage']['caption'] : undefined,
    isRecord(message['videoMessage']) ? message['videoMessage']['caption'] : undefined,
    isRecord(message['buttonsResponseMessage'])
      ? message['buttonsResponseMessage']['selectedDisplayText']
      : undefined,
    isRecord(message['listResponseMessage']) ? message['listResponseMessage']['title'] : undefined,
  ]
  return candidates.find((candidate): candidate is string => typeof candidate === 'string')
}

function instanteDaMensagem(timestamp: unknown, dateTime?: string): Date | undefined {
  if (typeof timestamp === 'number' && Number.isFinite(timestamp) && timestamp > 0) {
    const instante = new Date(timestamp * 1000)
    if (!Number.isNaN(instante.getTime())) return instante
  }
  if (dateTime) {
    const instante = new Date(dateTime)
    if (!Number.isNaN(instante.getTime())) return instante
  }
  return undefined
}

function tokenMatches(expected: string, received: string): boolean {
  const expectedBytes = Buffer.from(expected)
  const receivedBytes = Buffer.from(received)
  return (
    expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
