import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { ok } from '~/contracts'
import { auditWriter } from '~/platform/audit'
import { assertRevision } from '~/platform/db'
import type { RequestContext } from '~/contracts/context'
import type { Tx } from '~/platform/db/types'
import { addDays, type LocalDate } from '~/platform/time'
import { CatalogErrors } from '../errors'
import { canonicalServiceSet, validBasisPoints, validPriceAndDuration } from '../domain/catalogo'
import {
  ServiceDurationChanged,
  ServicePriceChanged,
  EnablementChanged,
  CommissionRateScheduled,
} from '../events'
import type { CatalogDependencies } from '../deps'
import { barbeiros, comboComponentes, comissaoVigencias, habilitacoes, servicos } from '../schema'

interface DadosServico {
  readonly nome: string
  readonly descricao?: string | undefined
  readonly precoCentavos: number
  readonly duracaoMinutos: number
}

export async function createService(tx: Tx, ctx: RequestContext, input: DadosServico) {
  if (!validPriceAndDuration(input.precoCentavos, input.duracaoMinutos)) {
    throw CatalogErrors.INVALID_SERVICE()
  }
  const [servico] = await tx
    .insert(servicos)
    .values({
      barbeariaId: ctx.barbeariaId,
      nome: input.nome.trim(),
      descricao: input.descricao?.trim() || null,
      precoCentavos: input.precoCentavos,
      duracaoMinutos: input.duracaoMinutos,
      tipo: 'simples',
      componentesAssinatura: null,
    })
    .returning({ id: servicos.id })
  if (!servico) throw CatalogErrors.INVALID_SERVICE()
  await auditWriter.record(tx, ctx, {
    action: 'catalog.criarServico',
    resource: { type: 'servico', id: servico.id },
    after: {
      nome: input.nome.trim(),
      precoCentavos: input.precoCentavos,
      duracaoMinutos: input.duracaoMinutos,
      tipo: 'simples',
      ativo: true,
    },
  })
  return ok({ servicoId: servico.id })
}

export async function createCombo(
  tx: Tx,
  ctx: RequestContext,
  input: DadosServico & { readonly componenteIds: readonly string[] },
) {
  const idsUnicos = [...new Set(input.componenteIds)]
  if (
    idsUnicos.length < 2 ||
    idsUnicos.length !== input.componenteIds.length ||
    !validPriceAndDuration(input.precoCentavos, input.duracaoMinutos)
  ) {
    throw CatalogErrors.INVALID_COMBO()
  }

  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${ctx.barbeariaId}), hashtext('catalog.combo'))`,
  )
  const componentes = await tx
    .select({ id: servicos.id, ativo: servicos.ativo, tipo: servicos.tipo })
    .from(servicos)
    .where(
      and(
        eq(servicos.barbeariaId, ctx.barbeariaId),
        inArray(servicos.id, idsUnicos),
        eq(servicos.ativo, true),
        eq(servicos.tipo, 'simples'),
      ),
    )
  if (componentes.length !== idsUnicos.length || componentes.some((item) => !item.ativo)) {
    throw CatalogErrors.INVALID_COMBO()
  }

  const assinatura = canonicalServiceSet(idsUnicos)
  const equivalente = await tx
    .select({ id: servicos.id })
    .from(servicos)
    .where(
      and(
        eq(servicos.barbeariaId, ctx.barbeariaId),
        eq(servicos.tipo, 'combo'),
        eq(servicos.ativo, true),
        eq(servicos.componentesAssinatura, assinatura),
      ),
    )
    .limit(1)
  if (equivalente.length > 0) throw CatalogErrors.DUPLICATE_COMBO()

  const [combo] = await tx
    .insert(servicos)
    .values({
      barbeariaId: ctx.barbeariaId,
      nome: input.nome.trim(),
      descricao: input.descricao?.trim() || null,
      precoCentavos: input.precoCentavos,
      duracaoMinutos: input.duracaoMinutos,
      tipo: 'combo',
      componentesAssinatura: assinatura,
    })
    .returning({ id: servicos.id })
  if (!combo) throw CatalogErrors.INVALID_COMBO()
  await tx.insert(comboComponentes).values(
    idsUnicos.map((componenteId) => ({
      barbeariaId: ctx.barbeariaId,
      comboId: combo.id,
      componenteId,
    })),
  )
  await auditWriter.record(tx, ctx, {
    action: 'catalog.criarCombo',
    resource: { type: 'servico', id: combo.id },
    after: {
      nome: input.nome.trim(),
      tipo: 'combo',
      componentes: assinatura,
      precoCentavos: input.precoCentavos,
      duracaoMinutos: input.duracaoMinutos,
      ativo: true,
    },
  })
  return ok({ servicoId: combo.id }, 1)
}

export async function updateService(
  tx: Tx,
  ctx: RequestContext,
  deps: CatalogDependencies,
  input: {
    readonly servicoId: string
    readonly precoCentavos: number
    readonly duracaoMinutos: number
  },
  expectedRevision: number | undefined,
) {
  if (!validPriceAndDuration(input.precoCentavos, input.duracaoMinutos)) {
    throw CatalogErrors.INVALID_SERVICE()
  }
  const [atual] = await tx
    .select()
    .from(servicos)
    .where(and(eq(servicos.barbeariaId, ctx.barbeariaId), eq(servicos.id, input.servicoId)))
    .for('update')
  if (!atual) throw CatalogErrors.SERVICE_NOT_FOUND()
  assertRevision(expectedRevision, atual.revisao)
  const novaRevisao = atual.revisao + 1
  await tx
    .update(servicos)
    .set({
      precoCentavos: input.precoCentavos,
      duracaoMinutos: input.duracaoMinutos,
      revisao: novaRevisao,
      atualizadoEm: ctx.clock.now(),
    })
    .where(and(eq(servicos.barbeariaId, ctx.barbeariaId), eq(servicos.id, input.servicoId)))
  await auditWriter.record(tx, ctx, {
    action: 'catalog.atualizarPrecoDuracao',
    resource: { type: 'servico', id: atual.id },
    before: { precoCentavos: atual.precoCentavos, duracaoMinutos: atual.duracaoMinutos },
    after: { precoCentavos: input.precoCentavos, duracaoMinutos: input.duracaoMinutos },
  })
  if (atual.precoCentavos !== input.precoCentavos) {
    await deps.outbox.publishInTx(
      tx,
      ServicePriceChanged.create(ctx, {
        aggregateId: atual.id,
        aggregateRevision: novaRevisao,
        payload: {
          servicoId: atual.id,
          precoAnteriorCentavos: atual.precoCentavos,
          precoCentavos: input.precoCentavos,
        },
      }),
    )
  }
  if (atual.duracaoMinutos !== input.duracaoMinutos) {
    await deps.outbox.publishInTx(
      tx,
      ServiceDurationChanged.create(ctx, {
        aggregateId: atual.id,
        aggregateRevision: novaRevisao,
        payload: {
          servicoId: atual.id,
          duracaoAnteriorMinutos: atual.duracaoMinutos,
          duracaoMinutos: input.duracaoMinutos,
        },
      }),
    )
  }
  return ok({ servicoId: atual.id }, novaRevisao)
}

export async function deactivateService(
  tx: Tx,
  ctx: RequestContext,
  input: { readonly servicoId: string },
  expectedRevision: number | undefined,
) {
  const [atual] = await tx
    .select()
    .from(servicos)
    .where(and(eq(servicos.barbeariaId, ctx.barbeariaId), eq(servicos.id, input.servicoId)))
    .for('update')
  if (!atual) throw CatalogErrors.SERVICE_NOT_FOUND()
  assertRevision(expectedRevision, atual.revisao)
  if (!atual.ativo) return ok({ servicoId: atual.id, ativo: false }, atual.revisao)

  if (atual.tipo === 'simples') {
    const combosAtivos = await tx
      .select({ id: comboComponentes.comboId })
      .from(comboComponentes)
      .innerJoin(
        servicos,
        and(
          eq(servicos.barbeariaId, comboComponentes.barbeariaId),
          eq(servicos.id, comboComponentes.comboId),
        ),
      )
      .where(
        and(
          eq(comboComponentes.barbeariaId, ctx.barbeariaId),
          eq(comboComponentes.componenteId, atual.id),
          eq(servicos.ativo, true),
        ),
      )
      .limit(1)
    if (combosAtivos.length > 0) throw CatalogErrors.SERVICE_IN_USE()
  }

  const novaRevisao = atual.revisao + 1
  await tx
    .update(servicos)
    .set({ ativo: false, revisao: novaRevisao, atualizadoEm: ctx.clock.now() })
    .where(and(eq(servicos.barbeariaId, ctx.barbeariaId), eq(servicos.id, atual.id)))
  await auditWriter.record(tx, ctx, {
    action: 'catalog.desativarServico',
    resource: { type: 'servico', id: atual.id },
    before: { ativo: true },
    after: { ativo: false },
  })
  return ok({ servicoId: atual.id, ativo: false }, novaRevisao)
}

export async function changeEnablement(
  tx: Tx,
  ctx: RequestContext,
  deps: CatalogDependencies,
  input: { readonly barbeiroId: string; readonly servicoId: string; readonly habilitado: boolean },
) {
  const [[barbeiro], [servico], [anterior]] = await Promise.all([
    tx
      .select({ id: barbeiros.id })
      .from(barbeiros)
      .where(
        and(
          eq(barbeiros.barbeariaId, ctx.barbeariaId),
          eq(barbeiros.id, input.barbeiroId),
          eq(barbeiros.ativo, true),
        ),
      ),
    tx
      .select({ id: servicos.id })
      .from(servicos)
      .where(
        and(
          eq(servicos.barbeariaId, ctx.barbeariaId),
          eq(servicos.id, input.servicoId),
          eq(servicos.ativo, true),
        ),
      ),
    tx
      .select()
      .from(habilitacoes)
      .where(
        and(
          eq(habilitacoes.barbeariaId, ctx.barbeariaId),
          eq(habilitacoes.barbeiroId, input.barbeiroId),
          eq(habilitacoes.servicoId, input.servicoId),
        ),
      )
      .for('update'),
  ])
  if (!barbeiro) throw CatalogErrors.BARBER_NOT_FOUND()
  if (!servico) throw CatalogErrors.SERVICE_NOT_FOUND()
  if (anterior?.habilitado === input.habilitado) return ok({ ...input })
  await tx
    .insert(habilitacoes)
    .values({
      barbeariaId: ctx.barbeariaId,
      barbeiroId: input.barbeiroId,
      servicoId: input.servicoId,
      habilitado: input.habilitado,
    })
    .onConflictDoUpdate({
      target: [habilitacoes.barbeariaId, habilitacoes.barbeiroId, habilitacoes.servicoId],
      set: { habilitado: input.habilitado },
    })
  await auditWriter.record(tx, ctx, {
    action: 'catalog.alterarHabilitacao',
    resource: { type: 'habilitacao', id: `${input.barbeiroId}:${input.servicoId}` },
    before: { habilitado: anterior?.habilitado ?? false },
    after: { habilitado: input.habilitado },
  })
  await deps.outbox.publishInTx(
    tx,
    EnablementChanged.create(ctx, {
      aggregateId: input.barbeiroId,
      aggregateRevision: 1,
      payload: input,
    }),
  )
  return ok({ ...input })
}

export async function scheduleCommission(
  tx: Tx,
  ctx: RequestContext,
  deps: CatalogDependencies,
  input: {
    readonly barbeiroId: string
    readonly servicoId: string
    readonly percentualAvulsoBp: number
    readonly percentualAssinanteBp: number
    readonly inicio: LocalDate
  },
) {
  if (
    !validBasisPoints(input.percentualAvulsoBp) ||
    !validBasisPoints(input.percentualAssinanteBp)
  ) {
    throw CatalogErrors.INVALID_COMMISSION()
  }
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${input.barbeiroId}), hashtext(${input.servicoId}))`,
  )
  const [[barbeiro], [servico], vigencias] = await Promise.all([
    tx
      .select({ id: barbeiros.id })
      .from(barbeiros)
      .where(
        and(
          eq(barbeiros.barbeariaId, ctx.barbeariaId),
          eq(barbeiros.id, input.barbeiroId),
          eq(barbeiros.ativo, true),
        ),
      ),
    tx
      .select({ id: servicos.id })
      .from(servicos)
      .where(
        and(
          eq(servicos.barbeariaId, ctx.barbeariaId),
          eq(servicos.id, input.servicoId),
          eq(servicos.ativo, true),
        ),
      ),
    tx
      .select()
      .from(comissaoVigencias)
      .where(
        and(
          eq(comissaoVigencias.barbeariaId, ctx.barbeariaId),
          eq(comissaoVigencias.barbeiroId, input.barbeiroId),
          eq(comissaoVigencias.servicoId, input.servicoId),
        ),
      )
      .orderBy(desc(comissaoVigencias.inicio))
      .for('update'),
  ])
  if (!barbeiro) throw CatalogErrors.BARBER_NOT_FOUND()
  if (!servico) throw CatalogErrors.SERVICE_NOT_FOUND()
  const anterior = vigencias[0]
  if (
    anterior &&
    (input.inicio <= anterior.inicio || (anterior.fim && input.inicio <= anterior.fim))
  ) {
    throw CatalogErrors.INVALID_EFFECTIVE_DATE()
  }
  if (anterior?.fim === null) {
    await tx
      .update(comissaoVigencias)
      .set({ fim: addDays(input.inicio, -1) })
      .where(eq(comissaoVigencias.id, anterior.id))
  }
  const [nova] = await tx
    .insert(comissaoVigencias)
    .values({
      barbeariaId: ctx.barbeariaId,
      barbeiroId: input.barbeiroId,
      servicoId: input.servicoId,
      percentualAvulsoBp: input.percentualAvulsoBp,
      percentualAssinanteBp: input.percentualAssinanteBp,
      inicio: input.inicio,
    })
    .returning({ id: comissaoVigencias.id })
  if (!nova) throw CatalogErrors.INVALID_COMMISSION()
  await auditWriter.record(tx, ctx, {
    action: 'catalog.agendarComissao',
    resource: { type: 'comissao_vigencia', id: nova.id },
    before: anterior
      ? { percentualAvulsoBp: anterior.percentualAvulsoBp, fim: input.inicio }
      : null,
    after: {
      barbeiroId: input.barbeiroId,
      servicoId: input.servicoId,
      percentualAvulsoBp: input.percentualAvulsoBp,
      percentualAssinanteBp: input.percentualAssinanteBp,
      inicio: input.inicio,
    },
  })
  await deps.outbox.publishInTx(
    tx,
    CommissionRateScheduled.create(ctx, {
      aggregateId: input.barbeiroId,
      aggregateRevision: 1,
      payload: {
        barbeiroId: input.barbeiroId,
        servicoId: input.servicoId,
        percentualAvulsoBp: input.percentualAvulsoBp,
        percentualAssinanteBp: input.percentualAssinanteBp,
        inicio: input.inicio,
      },
    }),
  )
  return ok({ vigenciaId: nova.id })
}
