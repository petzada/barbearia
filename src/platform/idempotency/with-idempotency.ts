import { and, eq } from 'drizzle-orm'
import type { RequestContext } from '~/contracts/context'
import { withTransaction } from '../db/transaction'
import type { Tx } from '../db/types'
import { IdempotencyErrors, SystemErrors } from '../errors/generic'
import { logger } from '../logging'
import { chavesIdempotencia } from './schema'

/** O resultado gravado e o devolvido passam pelo mesmo JSON: primeira execução e replay são idênticos. */
function normalizar<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null)) as T
}

export function idempotencyScopeOf(ctx: RequestContext): string {
  return ctx.actorId ?? 'anonimo'
}

/**
 * Executa `fn` uma única vez por (barbearia, ator, operação, chave) (PRD §7.3):
 * - mesma chave + mesmo payload → devolve o resultado da primeira execução, sem executar `fn`;
 * - mesma chave + payload diferente → `IDEMPOTENCY.KEY_REUSED`.
 *
 * Tudo acontece numa transação: a reserva da chave, o efeito de `fn` (inclua nela a auditoria e a
 * publicação no outbox) e o resultado são confirmados juntos. Se `fn` lança, a chave não fica gravada e a
 * retentativa executa de novo. Duas chamadas concorrentes com a mesma chave: a segunda espera no índice
 * único a primeira terminar e então repete o resultado dela.
 *
 * `fn` deve ser determinístico em relação a efeitos externos (nenhum dentro dela) e devolver JSON puro.
 */
export async function withIdempotency<T>(
  ctx: RequestContext,
  operation: string,
  key: string,
  payloadHash: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  const atorId = idempotencyScopeOf(ctx)
  return withTransaction(ctx, async (tx) => {
    const reservada = await tx
      .insert(chavesIdempotencia)
      .values({
        barbeariaId: ctx.barbeariaId,
        atorId,
        operacao: operation,
        chave: key,
        hashPayload: payloadHash,
      })
      .onConflictDoNothing()
      .returning({ id: chavesIdempotencia.id })

    const linha = reservada[0]
    if (linha) {
      const resultado = normalizar(await fn(tx))
      await tx
        .update(chavesIdempotencia)
        .set({ resultado })
        .where(eq(chavesIdempotencia.id, linha.id))
      return resultado
    }

    const [existente] = await tx
      .select({
        hashPayload: chavesIdempotencia.hashPayload,
        resultado: chavesIdempotencia.resultado,
      })
      .from(chavesIdempotencia)
      .where(
        and(
          eq(chavesIdempotencia.barbeariaId, ctx.barbeariaId),
          eq(chavesIdempotencia.atorId, atorId),
          eq(chavesIdempotencia.operacao, operation),
          eq(chavesIdempotencia.chave, key),
        ),
      )
    if (!existente) {
      // Conflito sem linha visível: não deveria acontecer em READ COMMITTED; não executa nada às cegas.
      logger.error({ correlationId: ctx.correlationId, operation }, 'chave de idempotência sumiu')
      throw SystemErrors.INTERNAL()
    }
    if (existente.hashPayload !== payloadHash) throw IdempotencyErrors.KEY_REUSED()
    return existente.resultado as T
  })
}
