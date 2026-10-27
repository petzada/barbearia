import { sql } from 'drizzle-orm'
import type { RequestContext } from '~/contracts/context'
import { hashSecretValue } from '~/platform/auth/otp-crypto'
import { createSystemContext } from '~/platform/context/request-context'
import type { Executor } from '~/platform/db/types'
import type { IdentityDeps } from '../infra/deps'

/** Serializa operações concorrentes sobre a mesma chave lógica (ex.: um telefone) até o fim da transação. */
export async function advisoryLock(tx: Executor, chave: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${chave}, 0))`)
}

/** Contexto de sistema para auditoria e eventos de fluxos sem sessão (login, primeiro acesso). */
export function contextoDeSistema(
  deps: IdentityDeps,
  barbeariaId: string,
  correlationId?: string,
): RequestContext {
  return createSystemContext({
    barbeariaId,
    clock: deps.clock,
    ...(correlationId ? { correlationId } : {}),
  })
}

export function ipHash(deps: IdentityDeps, ip: string | null | undefined): string {
  return hashSecretValue({ value: ip ?? 'desconhecido', purpose: 'ip', secret: deps.secret })
}
