import type {
  NotificationChannel,
  NotificationHealth,
  NotificationMessage,
  NotificationOutcome,
  NotificationProvider,
} from '~/contracts/ports/notification-provider'

/** Fake em memória com o mesmo contrato público: repete sucesso pela chave e não simula chamadas reais. */
export class FakeWhatsAppProvider implements NotificationProvider {
  readonly sent: NotificationMessage[] = []
  nextOutcome: NotificationOutcome | null = null
  private readonly outcomes = new Map<string, NotificationOutcome>()
  private readonly payloads = new Map<string, string>()

  send(message: NotificationMessage): Promise<NotificationOutcome> {
    const payload = JSON.stringify([message.channel, message.toE164, message.text])
    const existing = this.outcomes.get(message.idempotencyKey)
    if (existing) {
      return Promise.resolve(
        this.payloads.get(message.idempotencyKey) === payload
          ? existing
          : { status: 'permanent_failure', reason: 'chave_idempotente_reutilizada' },
      )
    }
    const outcome = this.nextOutcome ?? {
      status: 'sent' as const,
      externalId: `fake-whatsapp-${this.sent.length + 1}`,
    }
    this.nextOutcome = null
    if (outcome.status === 'sent') {
      this.sent.push(message)
      this.outcomes.set(message.idempotencyKey, outcome)
      this.payloads.set(message.idempotencyKey, payload)
    }
    return Promise.resolve(outcome)
  }

  health(channel: NotificationChannel): Promise<NotificationHealth> {
    return Promise.resolve({ channel, connected: true })
  }
}
