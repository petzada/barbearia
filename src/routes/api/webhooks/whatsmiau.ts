import { createFileRoute } from '@tanstack/react-router'
import { receiveWebhook } from '~/platform/inbox'
import { createWhatsMiauWebhookAdapter } from '~/integrations/whatsmiau/webhook'

export const Route = createFileRoute('/api/webhooks/whatsmiau')({
  server: {
    handlers: {
      POST: ({ request }) => receiveWebhook(request, createWhatsMiauWebhookAdapter()),
    },
  },
})
