/**
 * Envelope de todo comando (PRD §7.3): `{ idempotencyKey, expectedRevision?, ...dados }`.
 * Mesma chave + mesmo payload → mesmo resultado; mesma chave + payload diferente → `IDEMPOTENCY.KEY_REUSED`.
 */
export interface CommandMeta {
  readonly idempotencyKey: string
  /** Revisão que a tela viu; diferente da atual → `CONCURRENCY.REVISION_CONFLICT`. */
  readonly expectedRevision?: number
}

export type CommandInput<TData> = TData & CommandMeta

/** Uma chave por intenção do usuário (um clique de "Confirmar"), reaproveitada nas retentativas. */
export function newIdempotencyKey(): string {
  return crypto.randomUUID()
}
