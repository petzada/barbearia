import { spawnSync } from 'node:child_process'
import pg from 'pg'
import { exigirBancoDescartavel } from '../src/platform/db/safety'
import { carregarEnvLocal, exigirVariavel } from './lib/env'

// Zera os schemas e reaplica as migrações. RECUSA qualquer banco que não termine em _dev/_test (D0082).
async function main(): Promise<void> {
  carregarEnvLocal()
  const teste = process.argv.includes('--test')
  const url = exigirVariavel(teste ? 'DATABASE_URL_TEST' : 'DATABASE_URL')
  const nome = exigirBancoDescartavel(url) // lança antes de qualquer comando destrutivo

  const cliente = new pg.Client({ connectionString: url })
  await cliente.connect()
  try {
    await cliente.query('drop schema if exists drizzle cascade')
    await cliente.query('drop schema if exists public cascade')
    await cliente.query('create schema public')
    await cliente.query('create extension if not exists btree_gist')
    console.log(`banco zerado: ${nome}`)
  } finally {
    await cliente.end()
  }

  const migracao = spawnSync(
    'pnpm',
    ['exec', 'tsx', 'scripts/db-migrate.ts', ...(teste ? ['--test'] : [])],
    {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    },
  )
  if (migracao.status !== 0) throw new Error('as migrações falharam após o reset')
}

main().catch((erro: unknown) => {
  console.error(`db:reset falhou: ${erro instanceof Error ? erro.message : String(erro)}`)
  process.exit(1)
})
