import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { auditoria, AUDIT_MAX_JSON_BYTES, auditWriter } from '../../src/platform/audit'
import { withTransaction } from '../../src/platform/db'
import { abrirBancoDeTeste, type BancoDeTeste } from './helpers/banco'

let banco: BancoDeTeste

beforeAll(async () => {
  banco = await abrirBancoDeTeste()
})
afterAll(async () => {
  await banco.encerrar()
})

async function linhasDeAuditoria(correlationId: string) {
  return banco.db
    .select()
    .from(auditoria)
    .where(
      and(
        eq(auditoria.barbeariaId, banco.barbearia.id),
        eq(auditoria.correlationId, correlationId),
      ),
    )
}

describe('AuditWriter (PRD §6.2, §7.5)', () => {
  it('grava ator, papéis, ação, recurso, antes/depois reduzidos, motivo e correlationId', async () => {
    const ctx = banco.contexto({ atorId: 'admin-1', roles: ['admin', 'barbeiro'] })
    await withTransaction(ctx, (tx) =>
      auditWriter.record(tx, ctx, {
        action: 'catalog.alterarPreco',
        resource: { type: 'servico', id: 'srv-1' },
        before: { precoCentavos: 5000 },
        after: { precoCentavos: 5500 },
        reason: 'reajuste de março',
      }),
    )
    const [linha] = await linhasDeAuditoria(ctx.correlationId)
    expect(linha).toMatchObject({
      barbeariaId: banco.barbearia.id,
      atorId: 'admin-1',
      atorPapeis: ['admin', 'barbeiro'],
      acao: 'catalog.alterarPreco',
      recursoTipo: 'servico',
      recursoId: 'srv-1',
      antes: { precoCentavos: 5000 },
      depois: { precoCentavos: 5500 },
      motivo: 'reajuste de março',
    })
    expect(linha?.ocorridaEm.toISOString()).toBe(banco.clock.now().toISOString())
  })

  it('grava na MESMA transação: rollback não deixa auditoria', async () => {
    const ctx = banco.contexto({ atorId: 'admin-1', roles: ['admin'] })
    await expect(
      withTransaction(ctx, async (tx) => {
        await auditWriter.record(tx, ctx, {
          action: 'x.desfeita',
          resource: { type: 'x', id: '1' },
        })
        throw new Error('falha depois de auditar')
      }),
    ).rejects.toThrow('falha depois de auditar')
    expect(await linhasDeAuditoria(ctx.correlationId)).toHaveLength(0)
  })

  it('commit mantém a auditoria junto da alteração', async () => {
    const ctx = banco.contexto({ atorId: 'admin-1', roles: ['admin'] })
    await withTransaction(ctx, async (tx) => {
      await auditWriter.record(tx, ctx, { action: 'x.um', resource: { type: 'x', id: '1' } })
      await auditWriter.record(tx, ctx, { action: 'x.dois', resource: { type: 'x', id: '1' } })
    })
    expect((await linhasDeAuditoria(ctx.correlationId)).map((l) => l.acao).sort()).toEqual([
      'x.dois',
      'x.um',
    ])
  })

  it('ação do sistema (job) registra ator nulo', async () => {
    const ctx = banco.contexto({ atorId: null })
    await withTransaction(ctx, (tx) =>
      auditWriter.record(tx, ctx, {
        action: 'jobs.lembrete',
        resource: { type: 'reserva', id: 'r1' },
      }),
    )
    const [linha] = await linhasDeAuditoria(ctx.correlationId)
    expect(linha?.atorId).toBeNull()
    expect(linha?.atorPapeis).toEqual([])
  })

  it('reduz o estado: segredos e telefones saem redigidos/mascarados', async () => {
    const ctx = banco.contexto({ atorId: 'admin-1', roles: ['admin'] })
    await withTransaction(ctx, (tx) =>
      auditWriter.record(tx, ctx, {
        action: 'identity.trocarTelefone',
        resource: { type: 'usuario', id: 'u1' },
        before: { telefone: '+5511987654321', otp: '123456' },
        after: { telefone: '+5511912345678', sessionToken: 'abc' },
      }),
    )
    const [linha] = await linhasDeAuditoria(ctx.correlationId)
    const texto = JSON.stringify(linha)
    expect(texto).not.toMatch(/987654321|912345678|123456|"abc"/)
    expect(linha?.antes).toEqual({ telefone: '+55*******4321', otp: '[redigido]' })
  })

  it('estado acima do limite falha fechado (nada é gravado truncado)', async () => {
    const ctx = banco.contexto({ atorId: 'admin-1', roles: ['admin'] })
    await expect(
      withTransaction(ctx, (tx) =>
        auditWriter.record(tx, ctx, {
          action: 'x.gigante',
          resource: { type: 'x', id: '1' },
          after: { texto: 'a'.repeat(AUDIT_MAX_JSON_BYTES + 1) },
        }),
      ),
    ).rejects.toMatchObject({ code: 'SYSTEM.INTERNAL' })
    expect(await linhasDeAuditoria(ctx.correlationId)).toHaveLength(0)
  })

  it('é append-only no banco: UPDATE e DELETE são recusados', async () => {
    const ctx = banco.contexto({ atorId: 'admin-1', roles: ['admin'] })
    await withTransaction(ctx, (tx) =>
      auditWriter.record(tx, ctx, { action: 'x.imutavel', resource: { type: 'x', id: '1' } }),
    )
    await expect(
      banco.db
        .update(auditoria)
        .set({ acao: 'adulterada' })
        .where(eq(auditoria.correlationId, ctx.correlationId)),
    ).rejects.toThrow()
    await expect(
      banco.db.delete(auditoria).where(eq(auditoria.correlationId, ctx.correlationId)),
    ).rejects.toThrow()
    const [linha] = await linhasDeAuditoria(ctx.correlationId)
    expect(linha?.acao).toBe('x.imutavel')
  })

  it('exige barbearia existente (FK)', async () => {
    const ctx = {
      ...banco.contexto({ atorId: 'a' }),
      barbeariaId: '00000000-0000-7000-8000-000000000000',
    }
    await expect(
      withTransaction(ctx, (tx) =>
        auditWriter.record(tx, ctx, { action: 'x.y', resource: { type: 'x', id: '1' } }),
      ),
    ).rejects.toThrow()
  })
})
