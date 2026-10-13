import type { RequestContext } from '~/contracts/context'
import { logger } from '../logging'
import { getDatabase } from './runtime'
import type { Tx } from './types'

export interface TransactionOptions {
  /** Tentativas totais em caso de deadlock/serialização (PRD §7.5). Padrão: 3. */
  readonly maxAttempts?: number
}

const SQLSTATE_RETENTAVEL = new Set(['40001', '40P01']) // serialization_failure, deadlock_detected

/** SQLSTATE do erro do Postgres, mesmo embrulhado pelo Drizzle (`cause`). */
export function sqlStateOf(error: unknown): string | undefined {
  let atual: unknown = error
  for (let nivel = 0; nivel < 5 && typeof atual === 'object' && atual !== null; nivel += 1) {
    const codigo = (atual as { code?: unknown }).code
    if (typeof codigo === 'string' && /^[0-9A-Z]{5}$/.test(codigo)) return codigo
    atual = (atual as { cause?: unknown }).cause
  }
  return undefined
}

export function isRetryableTransactionError(error: unknown): boolean {
  const estado = sqlStateOf(error)
  return estado !== undefined && SQLSTATE_RETENTAVEL.has(estado)
}

/**
 * Executa `fn` numa transação `READ COMMITTED` e repete, de forma limitada, em deadlock/serialização.
 * `fn` pode rodar mais de uma vez: não faça efeitos externos dentro dela (persistir intenção → commit →
 * chamar o provedor, PRD §7.5). Locks lógicos na ordem: cliente → assinatura/ciclo → plano → barbeiro → período.
 */
export async function withTransaction<T>(
  ctx: RequestContext,
  fn: (tx: Tx) => Promise<T>,
  options: TransactionOptions = {},
): Promise<T> {
  const db = getDatabase()
  const maximo = options.maxAttempts ?? 3
  for (let tentativa = 1; ; tentativa += 1) {
    try {
      return await db.transaction(fn)
    } catch (error) {
      if (tentativa >= maximo || !isRetryableTransactionError(error)) throw error
      logger.warn(
        { correlationId: ctx.correlationId, tentativa, sqlState: sqlStateOf(error) },
        'transação repetida após deadlock/serialização',
      )
    }
  }
}
