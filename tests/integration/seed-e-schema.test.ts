import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  barbearias,
  getDeployBarbearia,
  resetDeployBarbearia,
  seedBarbearia,
} from '../../src/platform/db'
import { newId } from '../../src/platform/ids'
import { loadEnv } from '../../src/platform/validation'
import { abrirBancoDeTeste, type BancoDeTeste } from './helpers/banco'

let banco: BancoDeTeste

beforeAll(async () => {
  banco = await abrirBancoDeTeste()
})
afterAll(async () => {
  resetDeployBarbearia()
  await banco.encerrar()
})

const slugNovo = (): string => `seed-${newId().slice(-12)}`

describe('seed da barbearia do deploy (D0019)', () => {
  it('cria a barbearia com id UUID v7, nome e fuso padrão', async () => {
    const slug = slugNovo()
    const criada = await seedBarbearia(banco.db, { slug })
    expect(criada).toMatchObject({ slug, nome: slug, fuso: 'America/Sao_Paulo' })
    expect(criada.id[14]).toBe('7')
  })

  it('é idempotente e não sobrescreve nome nem fuso já configurados (marca é de T08)', async () => {
    const slug = slugNovo()
    const primeira = await seedBarbearia(banco.db, {
      slug,
      nome: 'Barbearia do Moura',
      fuso: 'America/Sao_Paulo',
    })
    const segunda = await seedBarbearia(banco.db, { slug, nome: 'Outro Nome', fuso: 'UTC' })
    expect(segunda.id).toBe(primeira.id)
    expect(segunda).toMatchObject({ nome: 'Barbearia do Moura', fuso: 'America/Sao_Paulo' })
    const linhas = await banco.db.select().from(barbearias).where(eq(barbearias.slug, slug))
    expect(linhas).toHaveLength(1)
  })

  it('recusa fuso inválido antes de tocar o banco', async () => {
    await expect(
      seedBarbearia(banco.db, { slug: slugNovo(), fuso: 'Marte/Olimpo' }),
    ).rejects.toThrow(RangeError)
  })

  it('o banco recusa slug fora do formato e slug repetido', async () => {
    await expect(
      banco.db.insert(barbearias).values({ slug: 'Slug Inválido', nome: 'x' }),
    ).rejects.toThrow()
    const slug = slugNovo()
    await banco.db.insert(barbearias).values({ slug, nome: 'x' })
    await expect(banco.db.insert(barbearias).values({ slug, nome: 'y' })).rejects.toThrow()
  })
})

describe('barbearia do deploy no contexto', () => {
  it('resolve pelo BARBEARIA_SLUG do ambiente e falha com instrução quando o seed não rodou', async () => {
    resetDeployBarbearia()
    const slug = loadEnv().BARBEARIA_SLUG
    // O global-setup zera o banco antes da suíte: o slug do ambiente ainda não existe aqui.
    await expect(getDeployBarbearia()).rejects.toThrow(/pnpm db:seed/)
    const criada = await seedBarbearia(banco.db, { slug })
    resetDeployBarbearia()
    expect((await getDeployBarbearia()).id).toBe(criada.id)
  })
})

describe('estrutura criada pela migração', () => {
  it('tem as três tabelas da plataforma, com barbearia_id obrigatório e índice único de idempotência', async () => {
    const { rows } = await banco.pool.query<{
      table_name: string
      column_name: string
      is_nullable: string
    }>(
      `select table_name, column_name, is_nullable from information_schema.columns
        where table_schema = 'public' and table_name in ('barbearias','auditoria','chaves_idempotencia')`,
    )
    const tabelas = new Set(rows.map((r) => r.table_name))
    expect([...tabelas].sort()).toEqual(['auditoria', 'barbearias', 'chaves_idempotencia'])
    for (const tabela of ['auditoria', 'chaves_idempotencia']) {
      const coluna = rows.find((r) => r.table_name === tabela && r.column_name === 'barbearia_id')
      expect(coluna?.is_nullable, `${tabela}.barbearia_id`).toBe('NO')
    }
    const indices = await banco.pool.query<{ indexname: string }>(
      `select indexname from pg_indexes where tablename = 'chaves_idempotencia'`,
    )
    expect(indices.rows.map((r) => r.indexname)).toContain('chaves_idempotencia_escopo_uidx')
  })
})
