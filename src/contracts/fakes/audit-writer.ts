import type { RequestContext } from '../context'
import type { AuditEntry, AuditWriter } from '../ports/audit-writer'

/** Fake em memória para testes de domínio que só querem saber se a auditoria foi pedida. */
export class FakeAuditWriter implements AuditWriter {
  readonly entries: Array<AuditEntry & { actorId: string | null; correlationId: string }> = []

  record(_executor: unknown, ctx: RequestContext, entry: AuditEntry): Promise<void> {
    this.entries.push({ ...entry, actorId: ctx.actorId, correlationId: ctx.correlationId })
    return Promise.resolve()
  }
}
