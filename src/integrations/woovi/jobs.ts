import { registerInboxHandler, INBOX_PROCESS_QUEUE } from '~/platform/inbox'
import { EXTERNAL_OPS_QUEUE } from '~/platform/external-ops'
import { createWooviPaymentProvider, wooviConfigFromEnv } from './config'
import './operations'
import { processWooviWebhook } from './webhook-handler'

/** Woovi usa as filas compartilhadas do T03: inbox.process e external-ops.advance. */
export const WOOVI_QUEUES = {
  inbox: INBOX_PROCESS_QUEUE,
  externalOperations: EXTERNAL_OPS_QUEUE,
} as const

registerInboxHandler('woovi', async (record, ctx) => {
  const config = wooviConfigFromEnv()
  await processWooviWebhook(record, ctx, createWooviPaymentProvider(config), config)
})
