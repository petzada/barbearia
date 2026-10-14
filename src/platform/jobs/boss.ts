import { PgBoss } from 'pg-boss'
import { exigirBancoDescartavel } from '../db/safety'
import { logger } from '../logging'
import { loadEnv } from '../validation/env'

// Schema do pg-boss dentro do mesmo banco do app (D0016: sem serviço extra, entra no backup do Postgres).
export const BOSS_SCHEMA = 'pgboss'
/** Fila onde o pg-boss deposita o job que esgotou as tentativas dele (crash, expiração). */
export const DEAD_LETTER_QUEUE = 'system.dead-letter'

export type BossRole = 'producer' | 'worker'

let conexao: string | undefined
let instancia: Promise<PgBoss> | undefined
let papel: BossRole | undefined

/** Testes: aponta o pg-boss para outro banco (`_test`). `undefined` volta a usar DATABASE_URL. */
export function setBossConnectionString(url: string | undefined): void {
  conexao = url
}

function connectionString(): string {
  const env = loadEnv()
  const url = conexao ?? env.DATABASE_URL
  // D0082: sob vitest, só `_test`, como o resto do acesso a banco.
  if (env.NODE_ENV === 'test' && !exigirBancoDescartavel(url).endsWith('_test')) {
    throw new Error('Testes exigem um banco _test para o pg-boss.')
  }
  return url
}

async function iniciar(role: BossRole): Promise<PgBoss> {
  const boss = new PgBoss({
    connectionString: connectionString(),
    schema: BOSS_SCHEMA,
    max: role === 'worker' ? 10 : 3,
    application_name: `barbearia-${role}`,
    // Só o worker mantém a supervisão (expiração, retenção) e o agendador; a web apenas enfileira.
    supervise: role === 'worker',
    schedule: role === 'worker',
  })
  boss.on('error', (erro: unknown) => logger.error({ err: erro }, 'pg-boss: erro'))
  await boss.start()
  return boss
}

/** Instância única por processo. O worker pede `worker`; web e scripts usam o padrão `producer`. */
export function getBoss(role: BossRole = 'producer'): Promise<PgBoss> {
  if (instancia) {
    if (role === 'worker' && papel === 'producer') {
      throw new Error(
        'O pg-boss já foi iniciado como produtor neste processo; inicie o worker primeiro.',
      )
    }
    return instancia
  }
  papel = role
  instancia = iniciar(role).catch((erro: unknown) => {
    instancia = undefined
    papel = undefined
    throw erro
  })
  return instancia
}

export interface StopBossOptions {
  readonly graceful?: boolean
  /** Tempo máximo esperando os jobs em andamento (ms). */
  readonly timeoutMs?: number
}

export async function stopBoss(options: StopBossOptions = {}): Promise<void> {
  const atual = instancia
  instancia = undefined
  papel = undefined
  if (!atual) return
  const boss = await atual
  await boss.stop({ graceful: options.graceful ?? true, timeout: options.timeoutMs ?? 30_000 })
}
