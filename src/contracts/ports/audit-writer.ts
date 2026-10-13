import type { Executor } from '~/platform/db/types'
import type { RequestContext } from '../context'

export interface AuditEntry {
  /** Verbo namespaced, ex.: `scheduling.reservar`, `identity.papel_concedido`. */
  readonly action: string
  readonly resource: { readonly type: string; readonly id: string }
  /** Estado anterior REDUZIDO: só os campos relevantes; nunca o registro inteiro nem dado pessoal. */
  readonly before?: Record<string, unknown> | null
  readonly after?: Record<string, unknown> | null
  readonly reason?: string
}

/**
 * Auditoria append-only (PRD §6.2). Chame com a transação da operação (`tx`) para que a auditoria
 * e a alteração sejam confirmadas ou desfeitas juntas (PRD §7.5).
 */
export interface AuditWriter {
  record(executor: Executor, ctx: RequestContext, entry: AuditEntry): Promise<void>
}
