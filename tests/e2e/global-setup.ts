import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'
import { publicarDocumento } from '../../src/modules/identity/application/terms-service'
import { seedBarbearia } from '../../src/platform/db/seed'
import { exigirBancoDescartavel } from '../../src/platform/db/safety'
import { systemClock } from '../../src/platform/time/clock'

// Prepara o banco `_test` (D0082) para o e2e: migrações, dados zerados, a barbearia do deploy e os documentos
// legais PROVISÓRIOS (o texto aprovado é do H03). O servidor do e2e usa este mesmo banco (playwright.config.ts).
export const ARQUIVO_DE_MENSAGENS = '.dev/e2e-mensagens.jsonl'

export default async function prepararE2e(): Promise<void> {
  const url = process.env['DATABASE_URL_TEST']
  if (!url) throw new Error('DATABASE_URL_TEST ausente. Rode "pnpm db:bootstrap" (veja o AGENTS.md).')
  if (!exigirBancoDescartavel(url).endsWith('_test')) throw new Error('O e2e exige um banco _test.')
  const slug = process.env['BARBEARIA_SLUG'] ?? 'moura'

  const pool = new pg.Pool({ connectionString: url, max: 2 })
  try {
    const db = drizzle(pool)
    await migrate(db, { migrationsFolder: 'drizzle' })
    await pool.query('truncate table barbearias cascade')
    const barbearia = await seedBarbearia(db, { slug })
    await db.transaction(async (tx) => {
      await publicarDocumento(tx, systemClock, {
        barbeariaId: barbearia.id,
        tipo: 'termos',
        versao: '1',
        texto: 'TEXTO PROVISÓRIO de Termos de Uso (e2e). O texto aprovado vem do H03.',
      })
      await publicarDocumento(tx, systemClock, {
        barbeariaId: barbearia.id,
        tipo: 'privacidade',
        versao: '1',
        texto: 'TEXTO PROVISÓRIO de Política de Privacidade (e2e). O texto aprovado vem do H03.',
      })
    })
  } finally {
    await pool.end()
  }
  mkdirSync('.dev', { recursive: true })
  rmSync(ARQUIVO_DE_MENSAGENS, { force: true })
  writeFileSync(ARQUIVO_DE_MENSAGENS, '')
}
