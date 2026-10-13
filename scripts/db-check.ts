import pg from 'pg'
import { exigirBancoDescartavel } from '../src/platform/db/safety'
import { carregarEnvLocal, exigirVariavel } from './lib/env'

// Verifica conectividade (select 1) e a extensão btree_gist nos bancos _dev e _test (D0082).
async function verificar(variavel: string): Promise<void> {
  const url = exigirVariavel(variavel)
  const nome = exigirBancoDescartavel(url)
  const cliente = new pg.Client({ connectionString: url })
  await cliente.connect()
  try {
    await cliente.query('select 1')
    const { rowCount } = await cliente.query(
      "select 1 from pg_extension where extname = 'btree_gist'",
    )
    if (rowCount === 0) {
      throw new Error(`btree_gist não habilitada em ${nome}. Rode "pnpm db:bootstrap".`)
    }
    console.log(`ok: ${variavel} -> ${nome} (select 1, btree_gist)`)
  } finally {
    await cliente.end()
  }
}

async function main(): Promise<void> {
  carregarEnvLocal()
  await verificar('DATABASE_URL')
  await verificar('DATABASE_URL_TEST')
}

main().catch((erro: unknown) => {
  console.error(`db:check falhou: ${erro instanceof Error ? erro.message : String(erro)}`)
  process.exit(1)
})
