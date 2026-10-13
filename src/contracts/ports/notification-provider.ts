/** `otp`: login (síncrono, usuário esperando). `avisos`: lembretes e avisos (com retentativa). D0031. */
export type NotificationChannel = 'otp' | 'avisos'

export interface NotificationMessage {
  readonly channel: NotificationChannel
  readonly toE164: string
  readonly text: string
  readonly idempotencyKey: string
}

export type NotificationOutcome =
  | { readonly status: 'sent'; readonly externalId: string }
  | { readonly status: 'transient_failure'; readonly reason: string }
  | { readonly status: 'permanent_failure'; readonly reason: string }

export interface NotificationHealth {
  readonly channel: NotificationChannel
  readonly connected: boolean
  readonly detail?: string
}

export interface NotificationProvider {
  send(message: NotificationMessage): Promise<NotificationOutcome>
  health?(channel: NotificationChannel): Promise<NotificationHealth>
}
