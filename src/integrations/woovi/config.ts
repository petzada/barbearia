import { createHash } from 'node:crypto'
import { loadEnv } from '~/platform/validation'
import { PermanentJobError } from '~/platform/jobs'
import { WooviApiClient, type WooviFetch } from './api-client'
import { WooviPaymentProvider } from './payment-provider'

export type WooviRetryPolicy = 'NON_PERMITED' | 'THREE_RETRIES_7_DAYS'

export interface WooviConfig {
  readonly appId: string
  readonly apiBaseUrl: string
  readonly account: string
  readonly environment: 'test' | 'prod'
  readonly subaccountId?: string
  readonly receiverDisplayName?: string
  readonly webhookHmacSecret?: string
  readonly immediateChargeEnabled: boolean
  readonly retryPolicy: WooviRetryPolicy
  readonly fetcher?: WooviFetch
  readonly webhookPublicKeys?: readonly string[]
}

export function wooviConfigFromEnv(): WooviConfig {
  const env = loadEnv()
  const appId = env.WOOVI_APP_ID
  const apiBaseUrl = env.WOOVI_API_BASE_URL ?? 'https://api.woovi-sandbox.com'
  if (!appId) throw new PermanentJobError('Configure WOOVI_APP_ID para usar a Woovi.')
  const retryPolicy = process.env.WOOVI_RETRY_POLICY ?? 'NON_PERMITED'
  if (retryPolicy !== 'NON_PERMITED' && retryPolicy !== 'THREE_RETRIES_7_DAYS') {
    throw new PermanentJobError('WOOVI_RETRY_POLICY deve ser NON_PERMITED ou THREE_RETRIES_7_DAYS.')
  }
  return {
    appId,
    apiBaseUrl,
    account: createHash('sha256').update(appId).digest('hex').slice(0, 20),
    environment: apiBaseUrl.includes('sandbox') ? 'test' : 'prod',
    ...(env.WOOVI_SUBACCOUNT_ID ? { subaccountId: env.WOOVI_SUBACCOUNT_ID } : {}),
    ...(process.env.WOOVI_RECEIVER_DISPLAY_NAME
      ? { receiverDisplayName: process.env.WOOVI_RECEIVER_DISPLAY_NAME }
      : {}),
    ...(env.WOOVI_WEBHOOK_SECRET ? { webhookHmacSecret: env.WOOVI_WEBHOOK_SECRET } : {}),
    immediateChargeEnabled: process.env.WOOVI_IMMEDIATE_CHARGE_ENABLED === 'true',
    retryPolicy,
  }
}

export function createWooviPaymentProvider(config = wooviConfigFromEnv()): WooviPaymentProvider {
  const client = new WooviApiClient(config.appId, config.apiBaseUrl, config.fetcher)
  return new WooviPaymentProvider(client, config)
}
