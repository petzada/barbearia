import type { RequestContext, Role } from '../../../src/contracts/context'
import { criarDb, criarPool } from '../../../src/platform/db/client'
import { setDatabase } from '../../../src/platform/db/runtime'
import { seedBarbearia } from '../../../src/platform/db/seed'
import type { Barbearia } from '../../../src/platform/db/schema/barbearias'
import { newId } from '../../../src/platform/ids'
import { createRequestContext } from '../../../src/platform/context/request-context'
import { createManualClock, type ManualClock } from '../../../src/platform/time/clock'

export interface BancoDeTeste {
  readonly db: ReturnType<typeof criarDb>
  readonly pool: ReturnType<typeof criarPool>
  readonly barbearia: Barbearia
  readonly clock: ManualClock
  encerrar(): Promise<void>
  contexto(opcoes?: { atorId?: string | null; roles?: Role[]; authTime?: Date }): RequestContext
}

/** Conecta ao banco `_test` (a trava de `setup.ts` já garantiu o nome) e cria uma barbearia exclusiva do teste. */
export async function abrirBancoDeTeste(): Promise<BancoDeTeste> {
  const pool = criarPool(process.env['DATABASE_URL_TEST'] ?? '')
  const db = criarDb(pool)
  setDatabase(db)
  const clock = createManualClock('2027-01-31T15:00:00Z')
  const barbearia = await seedBarbearia(db, { slug: `teste-${newId().slice(-12)}` })
  return {
    db,
    pool,
    barbearia,
    clock,
    async encerrar() {
      setDatabase(undefined)
      await pool.end()
    },
    contexto(opcoes = {}) {
      const atorId = opcoes.atorId === undefined ? newId() : opcoes.atorId
      return createRequestContext({
        barbeariaId: barbearia.id,
        clock,
        session: atorId
          ? {
              actorId: atorId,
              roles: opcoes.roles ?? ['cliente'],
              sessionId: newId(),
              authTime: opcoes.authTime ?? clock.now(),
            }
          : null,
      })
    },
  }
}
