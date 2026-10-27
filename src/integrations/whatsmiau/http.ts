import type { NotificationHealth } from '~/contracts/ports/notification-provider'
import {
  WHATSMAIU_API_BASE_URL,
  WHATSMAIU_HEALTH_TIMEOUT_MS,
  WHATSMAIU_MAX_MESSAGES_PER_MINUTE,
  WHATSMAIU_SEND_TIMEOUT_MS,
  type WhatsMiauChannelConfig,
} from './config'

const proximaChamadaPorInstancia = new Map<string, number>()

export class WhatsMiauHttpError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfterMs?: number,
  ) {
    super(`WhatsMiau respondeu HTTP ${status}.`)
    this.name = 'WhatsMiauHttpError'
  }

  get transient(): boolean {
    return this.status === 408 || this.status === 425 || this.status === 429 || this.status >= 500
  }
}

export async function sendText(
  config: WhatsMiauChannelConfig,
  input: { readonly toE164: string; readonly text: string; readonly deliveryId: string },
  options: {
    readonly fetcher?: typeof fetch
    readonly signal?: AbortSignal
    readonly timeoutMs?: number
    readonly maxMessagesPerMinute?: number
  } = {},
): Promise<{ readonly externalId: string; readonly providerExternalId: boolean }> {
  const signal =
    options.signal ?? AbortSignal.timeout(options.timeoutMs ?? WHATSMAIU_SEND_TIMEOUT_MS)
  await aguardarLimite(
    config.instance,
    options.maxMessagesPerMinute ?? WHATSMAIU_MAX_MESSAGES_PER_MINUTE,
    signal,
  )
  const fetcher = options.fetcher ?? fetch
  const resposta = await fetcher(
    `${WHATSMAIU_API_BASE_URL}/message/sendText/${encodeURIComponent(config.instance)}`,
    {
      method: 'POST',
      headers: { apikey: config.apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ number: input.toE164.slice(1), text: input.text }),
      signal,
    },
  )
  if (!resposta.ok) {
    throw new WhatsMiauHttpError(
      resposta.status,
      resposta.status === 429 ? retryAfterMs(resposta.headers.get('retry-after')) : undefined,
    )
  }
  const dados: unknown = await resposta.json().catch(() => undefined)
  const externalId = idExterno(dados)
  return externalId
    ? { externalId, providerExternalId: true }
    : { externalId: `whatsmiau-local:${input.deliveryId}`, providerExternalId: false }
}

export async function checkHealth(
  channel: 'otp' | 'avisos',
  config: WhatsMiauChannelConfig,
  fetcher: typeof fetch = fetch,
): Promise<NotificationHealth> {
  try {
    const response = await fetcher(
      `${WHATSMAIU_API_BASE_URL}/instance/connectionState/${encodeURIComponent(config.instance)}`,
      {
        headers: { apikey: config.apiKey },
        signal: AbortSignal.timeout(WHATSMAIU_HEALTH_TIMEOUT_MS),
      },
    )
    if (!response.ok) return { channel, connected: false, detail: `api_http_${response.status}` }
    const body: unknown = await response.json()
    const state = campo(body, 'state')
    const suspenso = campo(body, 'suspended') === true
    return {
      channel,
      connected: state === 'open' && !suspenso,
      detail: suspenso
        ? 'instancia_suspensa'
        : typeof state === 'string'
          ? `estado:${state}`
          : 'estado_ausente',
    }
  } catch {
    return { channel, connected: false, detail: 'api_indisponivel' }
  }
}

export async function withTimeout<T>(
  timeoutMs: number,
  execute: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new Error('timeout'))
    }, timeoutMs)
  })
  try {
    return await Promise.race([execute(controller.signal), timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function idExterno(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  const registro = value as Record<string, unknown>
  const key = registro['key']
  const nestedId =
    key && typeof key === 'object' ? (key as Record<string, unknown>)['id'] : undefined
  for (const candidate of [nestedId, registro['messageId'], registro['keyId'], registro['id']]) {
    if (typeof candidate === 'string' && candidate.trim() !== '') return candidate
  }
  return undefined
}

function campo(value: unknown, key: string): unknown {
  return value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined
}

function retryAfterMs(value: string | null): number | undefined {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
  const at = Date.parse(value)
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now())
}

async function aguardarLimite(
  instance: string,
  perMinute: number,
  signal: AbortSignal,
): Promise<void> {
  const limite =
    Number.isFinite(perMinute) && perMinute > 0 ? perMinute : WHATSMAIU_MAX_MESSAGES_PER_MINUTE
  const agora = Date.now()
  const proxima = proximaChamadaPorInstancia.get(instance) ?? agora
  const espera = Math.max(0, proxima - agora)
  proximaChamadaPorInstancia.set(instance, Math.max(proxima, agora) + 60_000 / limite)
  if (espera <= 0) return
  await new Promise<void>((resolver, rejeitar) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancelar)
      resolver()
    }, espera)
    const cancelar = (): void => {
      clearTimeout(timer)
      rejeitar(signal.reason ?? new DOMException('Envio cancelado.', 'AbortError'))
    }
    if (signal.aborted) {
      cancelar()
      return
    }
    signal.addEventListener('abort', cancelar, { once: true })
  })
}
