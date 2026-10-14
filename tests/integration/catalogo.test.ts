import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { newId } from '../../src/platform/ids'
import {
  createServiceOperation,
  createComboOperation,
  listAdminCatalogOperation,
} from '../../src/modules/catalog/server'
import {
  changeEnablementOperation,
  listPublicBarbersOperation,
  listPublicCatalogOperation,
  scheduleCommissionOperation,
} from '../../src/modules/catalog/server'
import {
  expandCombo,
  isEnabledForAll,
  percentAt,
  type Habilitacao,
} from '../../src/modules/catalog'
import { barbeiros, comissaoVigencias, servicos } from '../../src/modules/catalog/schema'
import type { ExecutionEnvironment } from '../../src/platform/context'
import type { Role } from '../../src/contracts'
import { abrirBancoDeTeste, type BancoDeTeste } from './helpers/banco'

let banco: BancoDeTeste

beforeAll(async () => {
  banco = await abrirBancoDeTeste()
})

afterAll(async () => {
  await banco.encerrar()
})

function ambiente(roles: readonly Role[] | null = ['admin']): ExecutionEnvironment {
  return {
    barbeariaId: banco.barbearia.id,
    clock: banco.clock,
    correlationId: `catalog-${newId().slice(-12)}`,
    session: roles
      ? {
          actorId: 'admin-teste',
          roles,
          sessionId: 'sessao-catalogo',
          authTime: banco.clock.now(),
        }
      : null,
  }
}

const chave = (): string => newId()

async function criarServico(nome: string, precoCentavos = 5_000, duracaoMinutos = 30) {
  const resultado = await createServiceOperation.run(ambiente(), {
    nome,
    descricao: undefined,
    precoCentavos,
    duracaoMinutos,
    idempotencyKey: chave(),
  })
  if (resultado.status !== 'ok') throw new Error('Não foi possível criar o serviço de teste.')
  return resultado.data.servicoId
}

async function criarBarbeiro(nomeExibicao: string) {
  const [barbeiro] = await banco.db
    .insert(barbeiros)
    .values({
      barbeariaId: banco.barbearia.id,
      usuarioId: `usuario-${newId()}`,
      nomeExibicao,
    })
    .returning()
  if (!barbeiro) throw new Error('Não foi possível criar o barbeiro de teste.')
  return barbeiro.id
}

describe('catálogo T06 no banco descartável', () => {
  it('rejeita combo duplicado em outra ordem, combo dentro de combo e componente inativo', async () => {
    const corte = await criarServico('Corte base')
    const barba = await criarServico('Barba base')
    const inativo = await criarServico('Serviço inativo')
    const combo = await createComboOperation.run(ambiente(), {
      nome: 'Combo teste',
      precoCentavos: 8_000,
      duracaoMinutos: 45,
      componenteIds: [corte, barba],
      idempotencyKey: chave(),
    })
    expect(combo.status).toBe('ok')
    if (combo.status !== 'ok') return

    const duplicado = await createComboOperation.run(ambiente(), {
      nome: 'Combo repetido',
      precoCentavos: 7_500,
      duracaoMinutos: 40,
      componenteIds: [barba, corte],
      idempotencyKey: chave(),
    })
    expect(duplicado).toMatchObject({ status: 'error', code: 'CATALOG.DUPLICATE_COMBO' })

    const aninhado = await createComboOperation.run(ambiente(), {
      nome: 'Combo aninhado',
      precoCentavos: 9_000,
      duracaoMinutos: 60,
      componenteIds: [combo.data.servicoId, corte],
      idempotencyKey: chave(),
    })
    expect(aninhado).toMatchObject({ status: 'error', code: 'CATALOG.INVALID_COMBO' })

    await banco.db
      .update(servicos)
      .set({ ativo: false })
      .where(and(eq(servicos.barbeariaId, banco.barbearia.id), eq(servicos.id, inativo)))
    const componenteInativo = await createComboOperation.run(ambiente(), {
      nome: 'Combo com inativo',
      precoCentavos: 6_000,
      duracaoMinutos: 30,
      componenteIds: [corte, inativo],
      idempotencyKey: chave(),
    })
    expect(componenteInativo).toMatchObject({ status: 'error', code: 'CATALOG.INVALID_COMBO' })
  })

  it('habilita combo e exige também as habilitações dos componentes', async () => {
    const corte = await criarServico('Corte matriz')
    const barba = await criarServico('Barba matriz')
    const combo = await createComboOperation.run(ambiente(), {
      nome: 'Combo matriz',
      precoCentavos: 9_000,
      duracaoMinutos: 50,
      componenteIds: [corte, barba],
      idempotencyKey: chave(),
    })
    if (combo.status !== 'ok') throw new Error('Combo de matriz não criado.')
    const barbeiroId = await criarBarbeiro('Barbeiro Matriz')
    await changeEnablementOperation.run(ambiente(), {
      barbeiroId,
      servicoId: combo.data.servicoId,
      habilitado: true,
      idempotencyKey: chave(),
    })
    const soCombo = await banco.db.select().from(servicos)
    const linhas: Habilitacao[] = soCombo
      .filter((servico) => servico.id === combo.data.servicoId)
      .map((servico) => ({ barbeiroId, servicoId: servico.id, habilitado: true }))
    const expandidos = expandCombo(
      [combo.data.servicoId],
      [{ id: combo.data.servicoId, componentes: [corte, barba], ativo: true }],
    )
    expect(isEnabledForAll(linhas, barbeiroId, expandidos)).toBe(false)

    for (const servicoId of [corte, barba]) {
      await changeEnablementOperation.run(ambiente(), {
        barbeiroId,
        servicoId,
        habilitado: true,
        idempotencyKey: chave(),
      })
      linhas.push({ barbeiroId, servicoId, habilitado: true })
    }
    expect(isEnabledForAll(linhas, barbeiroId, expandidos)).toBe(true)
  })

  it('fecha a vigência anterior no dia local anterior e rejeita sobreposição no banco', async () => {
    const servicoId = await criarServico('Serviço com vigência')
    const barbeiroId = await criarBarbeiro('Barbeiro Vigência')
    const primeira = await scheduleCommissionOperation.run(ambiente(), {
      barbeiroId,
      servicoId,
      percentualAvulsoBp: 3_500,
      percentualAssinanteBp: 2_500,
      inicio: '2027-10-01',
      idempotencyKey: chave(),
    })
    expect(primeira.status).toBe('ok')
    const segunda = await scheduleCommissionOperation.run(ambiente(), {
      barbeiroId,
      servicoId,
      percentualAvulsoBp: 4_000,
      percentualAssinanteBp: 3_000,
      inicio: '2027-10-15',
      idempotencyKey: chave(),
    })
    expect(segunda.status).toBe('ok')

    const vigencias = await banco.db
      .select()
      .from(comissaoVigencias)
      .where(
        and(
          eq(comissaoVigencias.barbeariaId, banco.barbearia.id),
          eq(comissaoVigencias.barbeiroId, barbeiroId),
          eq(comissaoVigencias.servicoId, servicoId),
        ),
      )
    expect(vigencias).toHaveLength(2)
    expect(vigencias.find((item) => item.inicio === '2027-10-01')?.fim).toBe('2027-10-14')
    expect(vigencias.find((item) => item.inicio === '2027-10-15')?.fim).toBeNull()
    expect(percentAt(vigencias, barbeiroId, servicoId, 'avulso', '2027-10-14')).toBe(3_500)
    expect(percentAt(vigencias, barbeiroId, servicoId, 'assinante', '2027-10-15')).toBe(3_000)
    await expect(
      banco.db.insert(comissaoVigencias).values({
        barbeariaId: banco.barbearia.id,
        barbeiroId,
        servicoId,
        percentualAvulsoBp: 3_000,
        percentualAssinanteBp: 3_000,
        inicio: '2027-10-14',
      }),
    ).rejects.toThrow()
  })

  it('não expõe usuário nem percentuais no DTO público e bloqueia barbeiro no admin', async () => {
    const servicoId = await criarServico('Serviço público')
    const barbeiroId = await criarBarbeiro('Profissional Público')
    await changeEnablementOperation.run(ambiente(), {
      barbeiroId,
      servicoId,
      habilitado: true,
      idempotencyKey: chave(),
    })
    await scheduleCommissionOperation.run(ambiente(), {
      barbeiroId,
      servicoId,
      percentualAvulsoBp: 3_200,
      inicio: '2027-10-01',
      idempotencyKey: chave(),
    })

    const publico = await listPublicBarbersOperation.run(ambiente(null), {})
    expect(publico.status).toBe('ok')
    if (publico.status === 'ok') {
      const perfil = publico.data.barbeiros.find(
        (barbeiro) => barbeiro.nome === 'Profissional Público',
      )
      expect(perfil).toMatchObject({
        nome: 'Profissional Público',
        servicos: ['Serviço público'],
      })
      expect(JSON.stringify(publico.data)).not.toMatch(/usuario|percentual|contato|telefone/i)
    }
    const catalogo = await listPublicCatalogOperation.run(ambiente(null), {})
    expect(catalogo.status).toBe('ok')
    if (catalogo.status === 'ok') {
      expect(JSON.stringify(catalogo.data)).not.toMatch(/percentual|comissao|usuario|telefone/i)
    }

    const barbeiroNoAdmin = await listAdminCatalogOperation.run(ambiente(['barbeiro']), {})
    expect(barbeiroNoAdmin).toMatchObject({ status: 'error', code: 'AUTH.FORBIDDEN' })
    const visitanteNoAdmin = await listAdminCatalogOperation.run(ambiente(null), {})
    expect(visitanteNoAdmin).toMatchObject({ status: 'error', code: 'AUTH.REQUIRED' })
  })
})
