import { and, asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { newId } from '../../src/platform/ids'
import {
  changeEnablementOperation,
  createComboOperation,
  createServiceOperation,
  deactivateServiceOperation,
  listAdminCatalogOperation,
  listPublicBarbersOperation,
  listPublicCatalogOperation,
  scheduleCommissionOperation,
  updateServiceOperation,
} from '../../src/modules/catalog/server'
import { catalogDependencies } from '../../src/modules/catalog/deps'
import {
  expandCombo,
  isEnabledForAll,
  percentAt,
  type Habilitacao,
} from '../../src/modules/catalog'
import {
  barbeiros,
  comissaoVigencias,
  habilitacoes,
  servicos,
} from '../../src/modules/catalog/schema'
import { auditoria } from '../../src/platform/audit/schema'
import type { FakeOutbox } from '../../src/contracts/fakes'
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
      usuarioId: newId(),
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
    const expandidos = expandCombo(
      [combo.data.servicoId],
      [{ id: combo.data.servicoId, componentes: [corte, barba], ativo: true }],
    )

    async function habilitar(servicoId: string) {
      const resultado = await changeEnablementOperation.run(ambiente(), {
        barbeiroId,
        servicoId,
        habilitado: true,
        idempotencyKey: chave(),
      })
      expect(resultado.status).toBe('ok')
    }
    // O que vale é a tabela `habilitacoes`, lida de volta depois de cada comando.
    async function lerHabilitacoes(): Promise<Habilitacao[]> {
      return banco.db
        .select({
          barbeiroId: habilitacoes.barbeiroId,
          servicoId: habilitacoes.servicoId,
          habilitado: habilitacoes.habilitado,
        })
        .from(habilitacoes)
        .where(
          and(
            eq(habilitacoes.barbeariaId, banco.barbearia.id),
            eq(habilitacoes.barbeiroId, barbeiroId),
          ),
        )
    }

    await habilitar(combo.data.servicoId)
    const soCombo = await lerHabilitacoes()
    expect(soCombo).toEqual([{ barbeiroId, servicoId: combo.data.servicoId, habilitado: true }])
    expect(isEnabledForAll(soCombo, barbeiroId, expandidos)).toBe(false)

    await habilitar(corte)
    await habilitar(barba)
    const todas = await lerHabilitacoes()
    expect(todas).toHaveLength(3)
    expect(isEnabledForAll(todas, barbeiroId, expandidos)).toBe(true)
  })

  it('publica habilitação e vigência com revisão monotônica por par barbeiro × serviço', async () => {
    const outbox = catalogDependencies.outbox as FakeOutbox
    const servicoId = await criarServico('Serviço de revisões')
    const barbeiroId = await criarBarbeiro('Barbeiro de revisões')
    const agregado = `${barbeiroId}:${servicoId}`
    for (const habilitado of [true, false, true]) {
      const resultado = await changeEnablementOperation.run(ambiente(), {
        barbeiroId,
        servicoId,
        habilitado,
        idempotencyKey: chave(),
      })
      expect(resultado.status).toBe('ok')
    }
    for (const [inicio, percentualAvulsoBp] of [
      ['2027-11-01', 3_000],
      ['2027-12-01', 3_500],
      ['2028-01-01', 4_000],
    ] as const) {
      const resultado = await scheduleCommissionOperation.run(ambiente(), {
        barbeiroId,
        servicoId,
        percentualAvulsoBp,
        inicio,
        idempotencyKey: chave(),
      })
      expect(resultado.status).toBe('ok')
    }
    const revisoes = (tipo: string) =>
      outbox.events
        .filter((evento) => evento.type === tipo && evento.aggregateId === agregado)
        .map((evento) => evento.aggregateRevision)
    expect(revisoes('EnablementChanged')).toEqual([1, 2, 3])
    expect(revisoes('CommissionRateScheduled')).toEqual([1, 2, 3])
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

    // A trilha append-only descreve a fronteira real: a anterior estava aberta e fecha no dia anterior.
    const novaVigencia = vigencias.find((item) => item.inicio === '2027-10-15')
    const [trilha] = await banco.db
      .select()
      .from(auditoria)
      .where(
        and(
          eq(auditoria.barbeariaId, banco.barbearia.id),
          eq(auditoria.acao, 'catalog.agendarComissao'),
          eq(auditoria.recursoId, novaVigencia?.id ?? ''),
        ),
      )
      .orderBy(asc(auditoria.ocorridaEm))
    expect(trilha?.antes).toEqual({
      percentualAvulsoBp: 3_500,
      percentualAssinanteBp: 2_500,
      inicio: '2027-10-01',
      fim: null,
    })
    expect(trilha?.depois).toMatchObject({
      percentualAvulsoBp: 4_000,
      percentualAssinanteBp: 3_000,
      inicio: '2027-10-15',
      fim: null,
      vigenciaAnteriorFim: '2027-10-14',
    })

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

  it('barbeiro, cliente e visitante não executam nenhum comando do catálogo', async () => {
    const servicoId = await criarServico('Serviço protegido')
    const outro = await criarServico('Outro serviço protegido')
    const barbeiroId = await criarBarbeiro('Barbeiro protegido')
    const quantosServicos = async () =>
      (
        await banco.db
          .select({ id: servicos.id })
          .from(servicos)
          .where(eq(servicos.barbeariaId, banco.barbearia.id))
      ).length
    const antes = await quantosServicos()

    const quem: ReadonlyArray<{
      env: ExecutionEnvironment
      esperado: { status: 'error'; code: string }
    }> = [
      { env: ambiente(['barbeiro']), esperado: { status: 'error', code: 'AUTH.FORBIDDEN' } },
      { env: ambiente(['cliente']), esperado: { status: 'error', code: 'AUTH.FORBIDDEN' } },
      { env: ambiente(null), esperado: { status: 'error', code: 'AUTH.REQUIRED' } },
    ]
    for (const { env, esperado } of quem) {
      expect(
        await createServiceOperation.run(env, {
          nome: 'Serviço indevido',
          descricao: undefined,
          precoCentavos: 5_000,
          duracaoMinutos: 30,
          idempotencyKey: chave(),
        }),
      ).toMatchObject(esperado)
      expect(
        await createComboOperation.run(env, {
          nome: 'Combo indevido',
          precoCentavos: 8_000,
          duracaoMinutos: 45,
          componenteIds: [servicoId, outro],
          idempotencyKey: chave(),
        }),
      ).toMatchObject(esperado)
      expect(
        await updateServiceOperation.run(env, {
          servicoId,
          precoCentavos: 9_900,
          duracaoMinutos: 60,
          idempotencyKey: chave(),
          expectedRevision: 1,
        }),
      ).toMatchObject(esperado)
      expect(
        await deactivateServiceOperation.run(env, {
          servicoId,
          idempotencyKey: chave(),
          expectedRevision: 1,
        }),
      ).toMatchObject(esperado)
      expect(
        await changeEnablementOperation.run(env, {
          barbeiroId,
          servicoId,
          habilitado: true,
          idempotencyKey: chave(),
        }),
      ).toMatchObject(esperado)
      expect(
        await scheduleCommissionOperation.run(env, {
          barbeiroId,
          servicoId,
          percentualAvulsoBp: 3_000,
          inicio: '2027-10-01',
          idempotencyKey: chave(),
        }),
      ).toMatchObject(esperado)
    }

    // As tentativas recusadas não gravaram nada.
    expect(await quantosServicos()).toBe(antes)
    const [intacto] = await banco.db
      .select({ preco: servicos.precoCentavos, ativo: servicos.ativo })
      .from(servicos)
      .where(eq(servicos.id, servicoId))
    expect(intacto).toEqual({ preco: 5_000, ativo: true })
    const gravadas = await banco.db
      .select({ id: habilitacoes.id })
      .from(habilitacoes)
      .where(
        and(
          eq(habilitacoes.barbeariaId, banco.barbearia.id),
          eq(habilitacoes.barbeiroId, barbeiroId),
        ),
      )
    expect(gravadas).toHaveLength(0)
  })

  it('serializa criar combo e desativar componente: nunca sobra combo ativo com componente inativo', async () => {
    for (let rodada = 0; rodada < 3; rodada += 1) {
      const corte = await criarServico(`Corte corrida ${rodada}`)
      const barba = await criarServico(`Barba corrida ${rodada}`)
      const nomeCombo = `Combo corrida ${rodada}`
      const [combo, desativado] = await Promise.all([
        createComboOperation.run(ambiente(), {
          nome: nomeCombo,
          precoCentavos: 8_000,
          duracaoMinutos: 45,
          componenteIds: [corte, barba],
          idempotencyKey: chave(),
        }),
        deactivateServiceOperation.run(ambiente(), {
          servicoId: corte,
          idempotencyKey: chave(),
          expectedRevision: 1,
        }),
      ])
      // RN02: exatamente um dos dois vence; o outro recebe o erro de domínio.
      expect([combo.status, desativado.status].sort()).toEqual(['error', 'ok'])
      const [componente] = await banco.db
        .select({ ativo: servicos.ativo })
        .from(servicos)
        .where(eq(servicos.id, corte))
      const combosAtivos = await banco.db
        .select({ id: servicos.id })
        .from(servicos)
        .where(
          and(
            eq(servicos.barbeariaId, banco.barbearia.id),
            eq(servicos.nome, nomeCombo),
            eq(servicos.ativo, true),
          ),
        )
      expect(combosAtivos.length > 0 && componente?.ativo === false).toBe(false)
    }
  })
})
