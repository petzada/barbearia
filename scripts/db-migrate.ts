import { existsSync } from 'node:fs'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'
import { exigirBancoDescartavel } from '../src/platform/db/safety'
import { carregarEnvLocal, exigirVariavel } from './lib/env'

// Aplica as migrações em DATABASE_URL (ou DATABASE_URL_TEST com --test). Só bancos _dev/_test (D0082);
// a migração do deploy é responsabilidade do T12. Nunca edite migração já aplicada (PRD §7.9).
export async function migrarBanco(url: string): Promise<void> {
  const nome = exigirBancoDescartavel(url)
  if (!existsSync('drizzle/meta/_journal.json')) {
    console.log(`nenhuma migração a aplicar em ${nome}`)
    return
  }
  const pool = new pg.Pool({ connectionString: url })
  try {
    await migrate(drizzle(pool), { migrationsFolder: 'drizzle' })
    console.log(`migrações aplicadas em ${nome}`)
  } finally {
    await pool.end()
  }
}

async function main(): Promise<void> {
  carregarEnvLocal()
  const variavel = process.argv.includes('--test') ? 'DATABASE_URL_TEST' : 'DATABASE_URL'
  await migrarBanco(exigirVariavel(variavel))
}

main().catch((erro: unknown) => {
  console.error(`db:migrate falhou: ${erro instanceof Error ? erro.message : String(erro)}`)
  process.exit(1)
})
