import { createFileRoute } from '@tanstack/react-router'
import { receiveWebhook } from '~/platform/inbox'
import { createWooviPaymentProvider, wooviConfigFromEnv } from '~/integrations/woovi'
import { createWooviWebhookAdapter } from '~/integrations/woovi/webhook'

export const Route = createFileRoute('/api/webhooks/woovi')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const config = wooviConfigFromEnv()
        const provider = createWooviPaymentProvider(config)
        return receiveWebhook(request, createWooviWebhookAdapter(provider, config))
      },
    },
  },
})
