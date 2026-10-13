import { afterAll, describe, expect, it } from 'vitest'
import { criarPool } from '../../src/platform/db/client'

const pool = criarPool(process.env['DATABASE_URL_TEST'] ?? '')

afterAll(async () => {
  await pool.end()
})

describe('Postgres do Railway (barbearia_test)', () => {
  it('responde a select 1', async () => {
    const { rows } = await pool.query<{ ok: number }>('select 1 as ok')
    expect(rows[0]?.ok).toBe(1)
  })

  it('está conectado ao banco _test e com btree_gist habilitada', async () => {
    const banco = await pool.query<{ nome: string }>('select current_database() as nome')
    expect(banco.rows[0]?.nome.endsWith('_test')).toBe(true)

    const extensao = await pool.query("select 1 from pg_extension where extname = 'btree_gist'")
    expect(extensao.rowCount).toBe(1)
  })
})
