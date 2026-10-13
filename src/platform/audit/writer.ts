import type { RequestContext } from '~/contracts/context'
import type { AuditEntry, AuditWriter } from '~/contracts/ports/audit-writer'
import type { Executor } from '../db/types'
import { SystemErrors } from '../errors/generic'
import { logger, redactSensitive } from '../logging'
import { auditoria } from './schema'

/** Limite do JSON de cada lado (antes/depois): auditoria guarda o essencial, não o registro. */
export const AUDIT_MAX_JSON_BYTES = 16 * 1024

function reduzir(
  estado: Record<string, unknown> | null | undefined,
  lado: 'antes' | 'depois',
  ctx: RequestContext,
  acao: string,
): Record<string, unknown> | null {
  if (estado === null || estado === undefined) return null
  const seguro = redactSensitive(estado) as Record<string, unknown>
  if (Buffer.byteLength(JSON.stringify(seguro), 'utf8') > AUDIT_MAX_JSON_BYTES) {
    // Falha fechada: gravar auditoria truncada esconderia exatamente o que se quer provar.
    logger.error(
      { correlationId: ctx.correlationId, acao, lado },
      'estado de auditoria maior que o limite; reduza os campos',
    )
    throw SystemErrors.INTERNAL()
  }
  return seguro
}

/**
 * Grava na tabela `auditoria` usando o executor recebido. Dentro de uma transação, a auditoria é
 * confirmada ou desfeita junto com a alteração (PRD §7.5): rollback não deixa linha de auditoria.
 */
export const auditWriter: AuditWriter = {
  async record(executor: Executor, ctx: RequestContext, entry: AuditEntry): Promise<void> {
    await executor.insert(auditoria).values({
      barbeariaId: ctx.barbeariaId,
      ocorridaEm: ctx.clock.now(),
      atorId: ctx.actorId,
      atorPapeis: [...ctx.roles],
      acao: entry.action,
      recursoTipo: entry.resource.type,
      recursoId: entry.resource.id,
      antes: reduzir(entry.before, 'antes', ctx, entry.action),
      depois: reduzir(entry.after, 'depois', ctx, entry.action),
      motivo: entry.reason ?? null,
      correlationId: ctx.correlationId,
    })
  },
}
