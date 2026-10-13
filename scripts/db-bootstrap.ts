import pg from 'pg'
import { bancoDescartavel } from '../src/platform/db/safety'
import {
  BANCO_DEV,
  BANCO_TEST,
  carregarEnvLocal,
  gravarEnvLocal,
  urlAdministrativaDoRailway,
  urlParaBanco,
} from './lib/env'

// D0082: cria (se faltar) barbearia_dev e barbearia_test no Postgres do Railway e habilita btree_gist.
// Idempotente. Nunca toca no banco padrão `railway`, que é do deploy.
async function garantirBanco(admin: pg.Client, nome: string): Promise<void> {
  if (!bancoDescartavel(nome)) throw new Error(`Recusado: "${nome}" não é um banco _dev/_test.`)
  const { rowCount } = await admin.query('select 1 from pg_database where datname = $1', [nome])
  if (rowCount === 0) {
    // CREATE DATABASE não aceita parâmetro; o nome é constante validada acima.
    await admin.query(`create database "${nome}"`)
    console.log(`banco criado: ${nome}`)
  } else {
    console.log(`banco já existe: ${nome}`)
  }
}

async function habilitarBtreeGist(urlAdmin: string, nome: string): Promise<void> {
  const cliente = new pg.Client({ connectionString: urlParaBanco(urlAdmin, nome) })
  await cliente.connect()
  try {
    await cliente.query('create extension if not exists btree_gist')
    console.log(`btree_gist habilitada: ${nome}`)
  } finally {
    await cliente.end()
  }
}

async function main(): Promise<void> {
  carregarEnvLocal()
  const urlAdmin = urlAdministrativaDoRailway()
  const admin = new pg.Client({ connectionString: urlAdmin })
  await admin.connect()
  try {
    for (const nome of [BANCO_DEV, BANCO_TEST]) await garantirBanco(admin, nome)
  } finally {
    await admin.end()
  }
  for (const nome of [BANCO_DEV, BANCO_TEST]) await habilitarBtreeGist(urlAdmin, nome)

  gravarEnvLocal({
    DATABASE_URL: urlParaBanco(urlAdmin, BANCO_DEV),
    DATABASE_URL_TEST: urlParaBanco(urlAdmin, BANCO_TEST),
  })
  console.log('.env.local atualizado (DATABASE_URL, DATABASE_URL_TEST). Rode "pnpm db:check".')
}

main().catch((erro: unknown) => {
  console.error(`db:bootstrap falhou: ${erro instanceof Error ? erro.message : String(erro)}`)
  process.exit(1)
})
