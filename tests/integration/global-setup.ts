import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'
import { exigirBancoDescartavel } from '../../src/platform/db/safety'

// Antes da suíte de integração: aplica as migrações no banco barbearia_test (D0082) e limpa os dados
// das execuções anteriores. TRUNCATE ... CASCADE a partir de `barbearias` alcança toda tabela de negócio
// (todas têm FK para ela) e não dispara o trigger append-only da auditoria, que só vale para UPDATE/DELETE.
export default async function preparaBancoDeTeste(): Promise<void> {
  config({ path: '.env.local', quiet: true })
  const url = process.env['DATABASE_URL_TEST']
  if (!url)
    throw new Error('DATABASE_URL_TEST ausente. Rode "pnpm db:bootstrap" (veja o AGENTS.md).')
  const nome = exigirBancoDescartavel(url)
  if (!nome.endsWith('_test'))
    throw new Error(`Testes de integração exigem um banco _test; recebido "${nome}".`)

  const pool = new pg.Pool({ connectionString: url, max: 2 })
  try {
    await migrate(drizzle(pool), { migrationsFolder: 'drizzle' })
    await pool.query('truncate table barbearias cascade')
  } finally {
    await pool.end()
  }
}
