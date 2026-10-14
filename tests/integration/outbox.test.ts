import { eq, sql } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { defineEvent } from '../../src/platform/context'
import { setDeadLetterHook, type DeadLetterEvent } from '../../src/platform/jobs/dead-letter'
import { PermanentJobError } from '../../src/platform/jobs/failures'
import { dispatchOutbox } from '../../src/platform/outbox/dispatcher'
import { drizzleOutbox } from '../../src/platform/outbox/publish'
import { registerEventHandler, resetEventHandlers } from '../../src/platform/outbox/registry'
import { outbox, outboxEntregas } from '../../src/platform/outbox/schema'
import { abrirBancoDeTeste, type BancoDeTeste } from './helpers/banco'

const EventoTeste = defineEvent<'EventoDeTeste', { valor: number }>('EventoDeTeste', 1)

describe('outbox de eventos de domínio', () => {
  let banco: BancoDeTeste
  const pendencias: DeadLetterEvent[] = []

  beforeAll(async () => {
    banco = await abrirBancoDeTeste()
    await banco.db.execute(
      sql`create table if not exists efeito_teste (id text primary key, evento text not null)`,
    )
  })

  afterAll(async () => {
    await banco.db.execute(sql`drop table if exists efeito_teste`)
    await banco.encerrar()
  })

  beforeEach(async () => {
    pendencias.length = 0
    setDeadLetterHook((e) => {
      pendencias.push(e)
      return Promise.resolve()
    })
    await banco.db.execute(sql`truncate table efeito_teste`)
    // Cada teste parte de um outbox vazio (sobras de outro teste seriam entregues ao handler deste).
    await banco.db.execute(sql`delete from outbox_entregas`)
    await banco.db.execute(sql`delete from outbox`)
  })

  afterEach(() => {
    resetEventHandlers()
    setDeadLetterHook(undefined)
  })

  async function publicar(aggregateId: string, valor = 1) {
    const ctx = banco.contexto()
    const evento = EventoTeste.create(ctx, {
      aggregateId,
      aggregateRevision: 1,
      payload: { valor },
    })
    await banco.db.transaction((tx) => drizzleOutbox.publishInTx(tx, evento))
    return evento
  }

  it('rollback da transação não publica o evento', async () => {
    const ctx = banco.contexto()
    const evento = EventoTeste.create(ctx, {
      aggregateId: 'a-rollback',
      aggregateRevision: 1,
      payload: { valor: 1 },
    })
    await expect(
      banco.db.transaction(async (tx) => {
        await drizzleOutbox.publishInTx(tx, evento)
        throw new Error('falha depois de publicar')
      }),
    ).rejects.toThrow('falha depois de publicar')
    const linhas = await banco.db.select().from(outbox).where(eq(outbox.id, evento.id))
    expect(linhas).toHaveLength(0)
  })

  it('entrega o evento ao handler do tipo, uma vez, com contexto e payload', async () => {
    const recebidos: Array<{
      id: string
      valor: number
      correlationId: string
      barbeariaId: string
    }> = []
    registerEventHandler({
      name: 'teste.coletor',
      eventType: 'EventoDeTeste',
      handle: (evento, { ctx }) => {
        recebidos.push({
          id: evento.id,
          valor: (evento.payload as { valor: number }).valor,
          correlationId: ctx.correlationId,
          barbeariaId: ctx.barbeariaId,
        })
        return Promise.resolve()
      },
    })
    const evento = await publicar('a-entrega', 42)
    const resumo = await dispatchOutbox({ clock: banco.clock })
    expect(resumo).toMatchObject({ events: 1, deliveries: 1, failed: 0 })
    expect(recebidos).toEqual([
      {
        id: evento.id,
        valor: 42,
        correlationId: evento.correlationId,
        barbeariaId: banco.barbearia.id,
      },
    ])
    const [linha] = await banco.db.select().from(outbox).where(eq(outbox.id, evento.id))
    expect(linha?.estado).toBe('processado')
  })

  it('publicar o mesmo evento duas vezes grava uma linha só', async () => {
    const ctx = banco.contexto()
    const evento = EventoTeste.create(ctx, {
      aggregateId: 'a-dup',
      aggregateRevision: 1,
      payload: { valor: 1 },
    })
    await banco.db.transaction(async (tx) => {
      await drizzleOutbox.publishInTx(tx, evento)
      await drizzleOutbox.publishInTx(tx, evento)
    })
    expect(await banco.db.select().from(outbox).where(eq(outbox.id, evento.id))).toHaveLength(1)
  })

  it('dispatcher entregando duas vezes o mesmo evento não executa o handler duas vezes', async () => {
    let execucoes = 0
    registerEventHandler({
      name: 'teste.contador',
      eventType: 'EventoDeTeste',
      handle: (_evento, { tx }) => {
        execucoes += 1
        return tx
          .execute(sql`insert into efeito_teste (id, evento) values (${`e${execucoes}`}, 'x')`)
          .then(() => undefined)
      },
    })
    const evento = await publicar('a-idem')
    await dispatchOutbox({ clock: banco.clock })
    expect(execucoes).toBe(1)

    // Simula a entrega repetida (reinício no meio, replay do operador): o evento volta a `pendente`.
    await banco.db
      .update(outbox)
      .set({ estado: 'pendente', processadoEm: null })
      .where(eq(outbox.id, evento.id))
    const segundo = await dispatchOutbox({ clock: banco.clock })
    expect(segundo).toMatchObject({ events: 1, deliveries: 0 })
    expect(execucoes).toBe(1)
    const efeitos = await banco.db.execute(sql`select count(*)::int as total from efeito_teste`)
    expect(Number((efeitos.rows[0] as { total: number }).total)).toBe(1)
  })

  it('dois dispatchers concorrentes entregam o evento uma única vez', async () => {
    let execucoes = 0
    registerEventHandler({
      name: 'teste.concorrente',
      eventType: 'EventoDeTeste',
      handle: async () => {
        execucoes += 1
        await new Promise((r) => setTimeout(r, 50))
      },
    })
    for (let i = 0; i < 5; i += 1) await publicar(`a-conc-${i}`)
    await Promise.all([
      dispatchOutbox({ clock: banco.clock }),
      dispatchOutbox({ clock: banco.clock }),
    ])
    expect(execucoes).toBe(5)
  })

  it('handler que falha desfaz o efeito dele, é retentado e não repete quem já entregou', async () => {
    let falhar = true
    let execucoesDoBom = 0
    registerEventHandler({
      name: 'teste.bom',
      eventType: 'EventoDeTeste',
      handle: () => {
        execucoesDoBom += 1
        return Promise.resolve()
      },
    })
    registerEventHandler({
      name: 'teste.instavel',
      eventType: 'EventoDeTeste',
      handle: async (_e, { tx }) => {
        await tx.execute(sql`insert into efeito_teste (id, evento) values ('instavel', 'x')`)
        if (falhar) throw new Error('indisponível')
      },
    })
    const evento = await publicar('a-falha')

    const primeiro = await dispatchOutbox({
      clock: banco.clock,
      retry: { delaysMs: [60_000], jitterRatio: 0 },
    })
    expect(primeiro).toMatchObject({ events: 1, retried: 1, failed: 0 })
    const efeito = await banco.db.execute(sql`select count(*)::int as total from efeito_teste`)
    expect(Number((efeito.rows[0] as { total: number }).total)).toBe(0) // o insert do handler foi desfeito

    // Antes do tempo de espera nada acontece; depois, só o handler que falhou roda de novo.
    expect((await dispatchOutbox({ clock: banco.clock })).events).toBe(0)
    banco.clock.advance(61_000)
    falhar = false
    const segundo = await dispatchOutbox({ clock: banco.clock })
    expect(segundo).toMatchObject({ events: 1, deliveries: 1 })
    expect(execucoesDoBom).toBe(1)
    const [linha] = await banco.db.select().from(outbox).where(eq(outbox.id, evento.id))
    expect(linha).toMatchObject({ estado: 'processado', tentativas: 1 })
    const entregas = await banco.db
      .select()
      .from(outboxEntregas)
      .where(eq(outboxEntregas.eventoId, evento.id))
    expect(entregas.map((e) => e.handler).sort()).toEqual(['teste.bom', 'teste.instavel'])
  })

  it('esgotadas as retentativas, o evento vira falhou e abre pendência; erro permanente não retenta', async () => {
    registerEventHandler({
      name: 'teste.sempre-falha',
      eventType: 'EventoDeTeste',
      handle: () => Promise.reject(new Error('sempre')),
    })
    const evento = await publicar('a-esgota')
    const politica = { delaysMs: [0], jitterRatio: 0 }
    await dispatchOutbox({ clock: banco.clock, retry: politica, limit: 5 })
    const [linha] = await banco.db.select().from(outbox).where(eq(outbox.id, evento.id))
    expect(linha).toMatchObject({ estado: 'falhou', tentativas: 2 })
    expect(pendencias).toMatchObject([{ source: 'outbox', reason: 'exhausted', ref: evento.id }])

    resetEventHandlers()
    pendencias.length = 0
    registerEventHandler({
      name: 'teste.permanente',
      eventType: 'EventoDeTeste',
      handle: () => Promise.reject(new PermanentJobError('configuração inválida')),
    })
    const permanente = await publicar('a-permanente')
    const resumo = await dispatchOutbox({ clock: banco.clock })
    expect(resumo).toMatchObject({ failed: 1, retried: 0 })
    expect(pendencias).toMatchObject([{ reason: 'permanent', ref: permanente.id }])
  })

  it('evento sem handler registrado é marcado processado (nada a fazer)', async () => {
    const evento = await publicar('a-sem-handler')
    await dispatchOutbox({ clock: banco.clock })
    const [linha] = await banco.db.select().from(outbox).where(eq(outbox.id, evento.id))
    expect(linha?.estado).toBe('processado')
  })
})
