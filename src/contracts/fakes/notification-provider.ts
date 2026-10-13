import type {
  NotificationChannel,
  NotificationHealth,
  NotificationMessage,
  NotificationOutcome,
  NotificationProvider,
} from '../ports/notification-provider'

/** Fake: registra o que seria enviado; `nextOutcome` permite simular falhas. Dedupe por chave idempotente. */
export class FakeNotificationProvider implements NotificationProvider {
  readonly sent: NotificationMessage[] = []
  nextOutcome: NotificationOutcome | null = null
  private readonly byKey = new Map<string, NotificationOutcome>()

  send(message: NotificationMessage): Promise<NotificationOutcome> {
    const anterior = this.byKey.get(message.idempotencyKey)
    if (anterior) return Promise.resolve(anterior)
    const resultado: NotificationOutcome = this.nextOutcome ?? {
      status: 'sent',
      externalId: `fake-msg-${this.sent.length + 1}`,
    }
    this.nextOutcome = null
    if (resultado.status === 'sent') {
      this.sent.push(message)
      this.byKey.set(message.idempotencyKey, resultado)
    }
    return Promise.resolve(resultado)
  }

  health(channel: NotificationChannel): Promise<NotificationHealth> {
    return Promise.resolve({ channel, connected: true })
  }
}
