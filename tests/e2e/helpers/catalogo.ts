import { config } from 'dotenv'
import { exigirBancoDeTesteE2E } from './banco-e2e'
import { seedBarbearia } from '../../../src/platform/db/seed'
import { criarDb, criarPool } from '../../../src/platform/db/client'
import {
  barbeiros,
  comboComponentes,
  comissaoVigencias,
  habilitacoes,
  servicos,
} from '../../../src/modules/catalog/schema'

export interface CatalogoE2E {
  readonly servicoNome: string
  readonly comboNome: string
  readonly barbeiroNome: string
}

/** Cria dados exclusivos no banco de teste descartável; não toca no banco de desenvolvimento. */
export async function prepararCatalogoE2E(): Promise<CatalogoE2E> {
  config({ path: '.env.local', quiet: true })
  const url = process.env['DATABASE_URL_TEST']
  const slug = process.env['BARBEARIA_SLUG']
  if (!slug) throw new Error('A preparação de catálogo E2E exige BARBEARIA_SLUG.')
  exigirBancoDeTesteE2E(url)
  if (!url) throw new Error('A preparação de catálogo E2E exige DATABASE_URL_TEST.')
  const pool = criarPool(url)
  const db = criarDb(pool)
  const barbearia = await seedBarbearia(db, { slug })
  const servicoNome = 'Serviço E2E T06'
  const componenteNome = 'Componente E2E T06'
  const comboNome = 'Combo E2E T06'
  const barbeiroNome = 'Barbeiro E2E T06'
  const servicoId = 'f0600000-0000-4000-8000-000000000001'
  const componenteId = 'f0600000-0000-4000-8000-000000000002'
  const comboId = 'f0600000-0000-4000-8000-000000000003'
  const barbeiroId = 'f0600000-0000-4000-8000-000000000004'

  await db
    .insert(servicos)
    .values([
      {
        id: servicoId,
        barbeariaId: barbearia.id,
        nome: servicoNome,
        precoCentavos: 6_500,
        duracaoMinutos: 30,
        tipo: 'simples',
        componentesAssinatura: null,
      },
      {
        id: componenteId,
        barbeariaId: barbearia.id,
        nome: componenteNome,
        precoCentavos: 4_000,
        duracaoMinutos: 20,
        tipo: 'simples',
        componentesAssinatura: null,
      },
      {
        id: comboId,
        barbeariaId: barbearia.id,
        nome: comboNome,
        precoCentavos: 9_000,
        duracaoMinutos: 45,
        tipo: 'combo',
        componentesAssinatura: [servicoId, componenteId].sort().join(','),
      },
    ])
    .onConflictDoNothing()
  await db
    .insert(comboComponentes)
    .values([
      { barbeariaId: barbearia.id, comboId, componenteId: servicoId },
      { barbeariaId: barbearia.id, comboId, componenteId },
    ])
    .onConflictDoNothing()
  await db
    .insert(barbeiros)
    .values({
      id: barbeiroId,
      barbeariaId: barbearia.id,
      usuarioId: 'f0600000-0000-4000-8000-0000000000a1',
      nomeExibicao: barbeiroNome,
      bio: 'Perfil fictício usado no teste de catálogo.',
    })
    .onConflictDoNothing()
  await db
    .insert(habilitacoes)
    .values({
      barbeariaId: barbearia.id,
      barbeiroId,
      servicoId,
      habilitado: true,
    })
    .onConflictDoNothing()
  await db
    .insert(comissaoVigencias)
    .values({
      barbeariaId: barbearia.id,
      barbeiroId,
      servicoId,
      percentualAvulsoBp: 3_500,
      percentualAssinanteBp: 3_500,
      inicio: '2000-01-01',
    })
    .onConflictDoNothing()
  await pool.end()
  return { servicoNome, comboNome, barbeiroNome }
}
