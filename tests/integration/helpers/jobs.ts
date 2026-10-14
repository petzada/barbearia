import { sql } from 'drizzle-orm'
import { getBoss, setBossConnectionString, stopBoss } from '../../../src/platform/jobs/boss'
import type { Db } from '../../../src/platform/db/types'

/** Aponta o pg-boss para o banco `_test` e o inicia como worker (mesma instância serve produtor e consumidor). */
export async function prepararBoss() {
  setBossConnectionString(process.env['DATABASE_URL_TEST'])
  return getBoss('worker')
}

export async function encerrarBoss(): Promise<void> {
  await stopBoss({ graceful: false })
  setBossConnectionString(undefined)
}

/** Nome de fila único por execução: o schema `pgboss` é compartilhado entre testes e execuções. */
export function filaUnica(prefixo: string): string {
  return `${prefixo}-${Math.random().toString(36).slice(2, 10)}`
}

export async function contarJobs(
  db: Db,
  fila: string,
  estados?: readonly string[],
): Promise<number> {
  const filtro = estados
    ? sql`and state::text in (${sql.join(
        estados.map((e) => sql`${e}`),
        sql`, `,
      )})`
    : sql``
  const resultado = await db.execute(
    sql`select count(*)::int as total from pgboss.job where name = ${fila} ${filtro}`,
  )
  return Number((resultado.rows[0] as { total: number }).total)
}

/** Espera uma condição (polling com prazo): prova por evento, não por `sleep` fixo. */
export async function esperarAte(
  condicao: () => Promise<boolean> | boolean,
  opcoes: { timeoutMs?: number; intervaloMs?: number; descricao?: string } = {},
): Promise<void> {
  const limite = Date.now() + (opcoes.timeoutMs ?? 20_000)
  while (Date.now() < limite) {
    if (await condicao()) return
    await new Promise((resolver) => setTimeout(resolver, opcoes.intervaloMs ?? 100))
  }
  throw new Error(
    `Condição não satisfeita a tempo${opcoes.descricao ? `: ${opcoes.descricao}` : ''}.`,
  )
}
