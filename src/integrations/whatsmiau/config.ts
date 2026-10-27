import type { NotificationChannel } from '~/contracts/ports/notification-provider'
import { loadEnv, type Env } from '~/platform/validation/env'

export const WHATSMAIU_API_BASE_URL = 'https://api.whatsmiau.dev/v2'
export const WHATSMAIU_SEND_TIMEOUT_MS = 10_000
export const WHATSMAIU_HEALTH_TIMEOUT_MS = 5_000
export const WHATSMAIU_MAX_MESSAGES_PER_MINUTE = 30

export interface WhatsMiauChannelConfig {
  readonly apiKey: string
  readonly instance: string
}

export function channelConfig(
  channel: NotificationChannel,
  env: Env = loadEnv(),
): WhatsMiauChannelConfig | undefined {
  const apiKey = channel === 'otp' ? env.WHATSAPP_OTP_API_KEY : env.WHATSAPP_AVISOS_API_KEY
  const instance = channel === 'otp' ? env.WHATSAPP_OTP_INSTANCE : env.WHATSAPP_AVISOS_INSTANCE
  if (!apiKey || !instance) return undefined
  return { apiKey, instance }
}

export function webhookConfig(env: Env = loadEnv()): { readonly token: string } | undefined {
  const token = env.WHATSAPP_WEBHOOK_TOKEN
  return token ? { token } : undefined
}
