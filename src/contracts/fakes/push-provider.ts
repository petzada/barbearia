import type {
  PushOutcome,
  PushPayload,
  PushProvider,
  PushSubscriptionData,
} from '../ports/push-provider'

/** Fake: registra os pushes; endpoints em `goneEndpoints` respondem `gone` (como 404/410 do serviço de push). */
export class FakePushProvider implements PushProvider {
  readonly sent: Array<{ subscription: PushSubscriptionData; payload: PushPayload }> = []
  readonly goneEndpoints = new Set<string>()

  send(subscription: PushSubscriptionData, payload: PushPayload): Promise<PushOutcome> {
    if (this.goneEndpoints.has(subscription.endpoint)) return Promise.resolve({ status: 'gone' })
    this.sent.push({ subscription, payload })
    return Promise.resolve({ status: 'sent' })
  }
}
