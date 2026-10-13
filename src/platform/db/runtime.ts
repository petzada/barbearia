import type pg from 'pg'
import { loadEnv } from '../validation/env'
import { criarDb, criarPool } from './client'
import { exigirBancoDescartavel } from './safety'
import type { Db } from './types'

// Ponto único de acesso ao banco do processo (web ou worker). Os testes de integração injetam o
// banco `_test` com `setDatabase`; em produção a conexão nasce de DATABASE_URL, validada no boot.
let atual: { db: Db; pool: pg.Pool | null } | undefined

function criarDoAmbiente(): { db: Db; pool: pg.Pool } {
  const env = loadEnv()
  // D0082: sob vitest (NODE_ENV=test) só o banco `_test` é aceito, mesmo que DATABASE_URL aponte para outro.
  if (env.NODE_ENV === 'test') {
    const nome = exigirBancoDescartavel(env.DATABASE_URL)
    if (!nome.endsWith('_test')) {
      throw new Error(`Testes exigem um banco _test; DATABASE_URL aponta para "${nome}".`)
    }
  }
  const pool = criarPool(env.DATABASE_URL)
  return { db: criarDb(pool), pool }
}

export function getDatabase(): Db {
  atual ??= criarDoAmbiente()
  return atual.db
}

/** Testes: usa um banco já criado (ex.: o `_test`). `undefined` volta ao padrão do ambiente. */
export function setDatabase(db: Db | undefined): void {
  atual = db ? { db, pool: null } : undefined
}

export async function closeDatabase(): Promise<void> {
  const pool = atual?.pool
  atual = undefined
  await pool?.end()
}
