import { ConcurrencyErrors } from '../errors/generic'

/**
 * Concorrência otimista (PRD §7.5). Padrão em todo comando que altera um agregado:
 *
 * ```ts
 * const linhas = await tx.update(reservas)
 *   .set({ estado: 'cancelada', revisao: sql`${reservas.revisao} + 1` })
 *   .where(and(eq(reservas.barbeariaId, ctx.barbeariaId), eq(reservas.id, id),
 *              eq(reservas.revisao, expectedRevision)))
 *   .returning()
 * const reserva = requireUpdatedRow(linhas)   // 0 linhas → CONCURRENCY.REVISION_CONFLICT
 * ```
 *
 * Já com o registro lido sob `SELECT … FOR UPDATE`, use `assertRevision(expectedRevision, atual.revisao)`.
 */
export function assertRevision(expected: number | undefined, actual: number): void {
  if (expected !== undefined && expected !== actual) throw ConcurrencyErrors.REVISION_CONFLICT()
}

export function requireUpdatedRow<T>(rows: readonly T[]): T {
  const [primeira] = rows
  if (primeira === undefined) throw ConcurrencyErrors.REVISION_CONFLICT()
  return primeira
}
