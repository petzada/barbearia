export interface PushSubscriptionData {
  readonly endpoint: string
  readonly keys: { readonly p256dh: string; readonly auth: string }
}

/** Payload mínimo (T30): tipo + id; o conteúdo vem da central ao abrir. Sem nome, telefone ou valores. */
export interface PushPayload {
  readonly type: string
  readonly id: string
}

export type PushOutcome =
  | { readonly status: 'sent' }
  /** 404/410: a assinatura não existe mais; o chamador a desativa. */
  | { readonly status: 'gone' }
  | { readonly status: 'transient_failure'; readonly reason: string }
  | { readonly status: 'permanent_failure'; readonly reason: string }

export interface PushProvider {
  send(subscription: PushSubscriptionData, payload: PushPayload): Promise<PushOutcome>
}
