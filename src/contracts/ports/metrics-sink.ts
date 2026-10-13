export type MetricProperties = Readonly<Record<string, string | number | boolean>>

export interface MetricEvent {
  readonly name: string
  /** Sem PII: nada de telefone, nome, e-mail, token ou OTP (PRD §9.5). T36 rejeita propriedades proibidas. */
  readonly properties?: MetricProperties
  readonly occurredAt?: Date
}

export interface MetricsSink {
  record(event: MetricEvent): void | Promise<void>
}
