import { and, eq } from 'drizzle-orm'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { entregas } from '../../src/integrations/whatsmiau/schema'
import { createWhatsMiauWebhookAdapter } from '../../src/integrations/whatsmiau/webhook'
import { DrizzleDeliveryStore } from '../../src/integrations/whatsmiau/deliveries'
import { processInboxRecord, receiveWebhook } from '../../src/platform/inbox'
import { inboxProvedor } from '../../src/platform/inbox/schema'
import { outbox } from '../../src/platform/outbox/schema'
import { parseEnv } from '../../src/platform/validation/env'
import type { RequestContext } from '../../src/contracts/context'
import { abrirBancoDeTeste, type BancoDeTeste } from './helpers/banco'
import { encerrarBoss, prepararBoss } from './helpers/jobs'
import '../../src/integrations/whatsmiau/jobs'

const UPSERT_FIXTURE: Record<string, unknown> = JSON.parse(
  readFileSync(new URL('../fixtures/whatsmiau/messages.upsert.json', import.meta.url), 'utf8'),
)
const UPDATE_FIXTURE: Record<string, unknown> = JSON.parse(
  readFileSync(new URL('../fixtures/whatsmiau/messages.update.json', import.meta.url), 'utf8'),
)
const TOKEN_FIXTURE = 'whatsmiau-webhook-fixture-token'

describe('webhook WhatsMiau', () => {
  let banco: BancoDeTeste
  let ctx: RequestContext
  const adapter = createWhatsMiauWebhookAdapter(
    parseEnv({
      DATABASE_URL: 'postgres://fixture:fixture@localhost/barbearia_t09_test',
      BARBEARIA_SLUG: 'barbearia-t09-test',
      WHATSAPP_WEBHOOK_TOKEN: TOKEN_FIXTURE,
    }),
  )

  beforeAll(async () => {
    banco = await abrirBancoDeTeste()
    ctx = banco.contexto({ atorId: null })
    await prepararBoss()
  })

  afterAll(async () => {
    await encerrarBoss()
    await banco.encerrar()
  })

  async function receber(corpo: string, token = TOKEN_FIXTURE): Promise<Response> {
    return receiveWebhook(
      new Request('https://app.exemplo.test/api/webhooks/whatsmiau', {
        method: 'POST',
        headers: { authorization: token },
        body: corpo,
      }),
      adapter,
      { db: banco.db, barbeariaId: banco.barbearia.id, clock: banco.clock },
    )
  }

  it('rejeita token inválido sem persistir webhook', async () => {
    const body = JSON.stringify(UPSERT_FIXTURE)
    const response = await receber(body, 'token-invalido')
    expect(response.status).toBe(401)
    const rows = await banco.db
      .select()
      .from(inboxProvedor)
      .where(eq(inboxProvedor.provedor, 'whatsmiau'))
    expect(rows).toHaveLength(0)
  })

  it('deduplica a mensagem e publica SAIR, sair e espaços em formato normalizado', async () => {
    const textos = ['SAIR', 'sair', ' Sair ']
    for (const [index, texto] of textos.entries()) {
      const fixture = structuredClone(UPSERT_FIXTURE) as {
        data: { key: { id: string }; message: { conversation: string } }
      }
      fixture.data.key.id = `fixture-inbound-${index + 1}`
      fixture.data.message.conversation = texto
      const body = JSON.stringify(fixture)
      const first = await receber(body)
      const second = await receber(body)
      expect(first.status).toBe(200)
      expect(second.status).toBe(200)
      expect(await second.json()).toMatchObject({ duplicate: true })
      const rows = await banco.db
        .select()
        .from(inboxProvedor)
        .where(eq(inboxProvedor.eventoExternoId, `fixture-inbound-${index + 1}`))
      expect(rows).toHaveLength(1)
      const row = rows[0]
      if (!row) throw new Error('webhook nao foi persistido no inbox')
      await processInboxRecord(row.id, ctx, 0, banco.db)
      const [event] = await banco.db
        .select()
        .from(outbox)
        .where(and(eq(outbox.id, row.id), eq(outbox.tipo, 'InboundWhatsAppMessage')))
      expect(event?.payload).toMatchObject({
        telefoneE164: '+5511999990000',
        texto: texto.trim(),
        textoNormalizado: 'SAIR',
      })
    }
  })

  it('confirma entrega ao receber status de leitura', async () => {
    const store = new DrizzleDeliveryStore(banco.db)
    const delivery = await store.createOrGet(ctx, {
      channel: 'avisos',
      toE164: '+5511999990000',
      text: 'fixture sem dado real',
      idempotencyKey: 'fixture-delivery-confirmation',
      instance: 'FixtureInbox',
    })
    await store.mark(ctx, delivery.id, {
      state: 'enviado',
      attempts: 1,
      externalId: 'fixture-sent-001',
    })
    const response = await receber(JSON.stringify(UPDATE_FIXTURE))
    expect(response.status).toBe(200)
    const parsed = (await response.json()) as { duplicate: boolean }
    expect(parsed.duplicate).toBe(false)
    const inboxRows = await banco.db
      .select()
      .from(inboxProvedor)
      .where(eq(inboxProvedor.eventoExternoId, 'fixture-sent-001:READ'))
    expect(inboxRows).toHaveLength(1)
    const inbox = inboxRows[0]
    if (!inbox) throw new Error('status nao foi persistido no inbox')
    await processInboxRecord(inbox.id, ctx, 0, banco.db)
    const [confirmed] = await banco.db.select().from(entregas).where(eq(entregas.id, delivery.id))
    expect(confirmed?.estado).toBe('confirmado')
  })
})
