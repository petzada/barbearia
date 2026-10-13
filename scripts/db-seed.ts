import { criarDb, criarPool } from '../src/platform/db/client'
import { seedBarbearia, seedInputFromEnv } from '../src/platform/db/seed'
import { loadEnv } from '../src/platform/validation/env'
import { carregarEnvLocal } from './lib/env'

// Cria a barbearia do deploy a partir de BARBEARIA_SLUG (D0019). Idempotente: rodar de novo não altera nada.
// Usa DATABASE_URL do ambiente (.env.local em dev; variáveis do Railway no deploy). Nunca imprime a URL.
async function main(): Promise<void> {
  carregarEnvLocal()
  const env = loadEnv()
  const pool = criarPool(env.DATABASE_URL)
  try {
    const barbearia = await seedBarbearia(criarDb(pool), seedInputFromEnv(env))
    console.log(
      `barbearia pronta: slug=${barbearia.slug} id=${barbearia.id} fuso=${barbearia.fuso}`,
    )
  } finally {
    await pool.end()
  }
}

main().catch((erro: unknown) => {
  console.error(`db:seed falhou: ${erro instanceof Error ? erro.message : String(erro)}`)
  process.exit(1)
})
