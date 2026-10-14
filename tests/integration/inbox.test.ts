import { eq, sql } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import type { Db } from '../../src/platform/db/types'
import {
  CARD_REMOVED,
  MAX_WEBHOOK_BODY_BYTES,
  processInboxRecord,
  receiveWebhook,
  registerInboxHandler,
  reprocessInboxRecord,
  resetInboxHandlers,
  sha256Hex,
  type InboxRecord,
  type WebhookAdapter,
} from '../../src/platform/inbox'
import { INBOX_PROCESS_QUEUE } from '../../src/platform/inbox/process'
import { inboxProvedor } from '../../src/platform/inbox/schema'
import { PermanentJobError } from '../../src/platform/jobs/failures'
import { PgBossJobQueue } from '../../src/platform/jobs/queue'
import { abrirBancoDeTeste, type BancoDeTeste } from './helpers/banco'
import { contarJobs, encerrarBoss, prepararBoss } from './helpers/jobs'

const SEGREDO = 'segredo-de-teste'

const adapter: WebhookAdapter = {
  provider: 'provedor-teste',
  verify: ({ headers }) =>
    headers.get('x-token') === SEGREDO ? { ok: true } : { ok: false, reason: 'token inválido' },
  parse: ({ rawBody, headers }) => {
    const corpo = JSON.parse(rawBody) as { id?: string }
    if (!corpo.id) throw new Error('sem id')
    return {
      account: 'conta-1',
      environment: 'test',
      eventId: corpo.id,
      headers: {
        'x-request-id': headers.get('x-request-id') ?? '',
        'x-token': headers.get('x-token') ?? '',
      },
    }
  },
}

function requisicao(
  corpo: string,
  cabecalhos: Record<string, string> = { 'x-token': SEGREDO },
): Request {
  return new Request('https://app.exemplo.test/api/webhooks/teste', {
    method: 'POST',
    headers: cabecalhos,
    body: corpo,
  })
}

describe('inbox de webhooks', () => {
  let banco: BancoDeTeste
  const queue = new PgBossJobQueue()

  beforeAll(async () => {
    banco = await abrirBancoDeTeste()
    await prepararBoss()
    await queue.enqueue({
      queue: INBOX_PROCESS_QUEUE.name,
      payload: { aquecer: true },
      singletonKey: 'aquecimento',
    })
  })

  afterAll(async () => {
    await encerrarBoss()
    await banco.encerrar()
  })

  afterEach(() => {
    resetInboxHandlers()
  })

  const receber = (
    corpo: string,
    cabecalhos?: Record<string, string>,
    deps: Parameters<typeof receiveWebhook>[2] = {},
  ) =>
    receiveWebhook(requisicao(corpo, cabecalhos), adapter, {
      barbeariaId: banco.barbearia.id,
      ...deps,
    })

  const linhas = (eventoExterno: string) =>
    banco.db.select().from(inboxProvedor).where(eq(inboxProvedor.eventoExternoId, eventoExterno))

  it('persiste e enfileira antes do ACK; guarda hash, conta, ambiente e só os cabeçalhos relevantes sem segredo', async () => {
    const corpo = JSON.stringify({ id: 'evt-persiste', valor: 1 })
    const antes = await contarJobs(banco.db, INBOX_PROCESS_QUEUE.name)
    const resposta = await receber(corpo, { 'x-token': SEGREDO, 'x-request-id': 'req-9' })
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ ok: true, duplicate: false })

    const [linha] = await linhas('evt-persiste')
    expect(linha).toMatchObject({
      provedor: 'provedor-teste',
      conta: 'conta-1',
      ambiente: 'test',
      estado: 'recebido',
      hashCorpo: sha256Hex(corpo),
      corpo,
    })
    expect(linha?.cabecalhos).toEqual({ 'x-request-id': 'req-9', 'x-token': '[redigido]' })
    expect(await contarJobs(banco.db, INBOX_PROCESS_QUEUE.name)).toBe(antes + 1)
  })

  it('mesmo webhook recebido duas vezes → um registro, um job, um processamento', async () => {
    const corpo = JSON.stringify({ id: 'evt-duplicado' })
    const processados: string[] = []
    registerInboxHandler('provedor-teste', (registro: InboxRecord) => {
      processados.push(registro.externalEventId)
      return Promise.resolve()
    })
    const antes = await contarJobs(banco.db, INBOX_PROCESS_QUEUE.name)
    const primeira = await receber(corpo)
    const segunda = await receber(corpo)
    expect(await primeira.json()).toEqual({ ok: true, duplicate: false })
    expect(segunda.status).toBe(200) // o provedor recebe 2xx e para de reenviar
    expect(await segunda.json()).toEqual({ ok: true, duplicate: true })

    const registros = await linhas('evt-duplicado')
    expect(registros).toHaveLength(1)
    expect(await contarJobs(banco.db, INBOX_PROCESS_QUEUE.name)).toBe(antes + 1)

    const id = registros[0]?.id ?? ''
    await processInboxRecord(id, banco.contexto({ atorId: null }), 0)
    await processInboxRecord(id, banco.contexto({ atorId: null }), 0) // job repetido: ignorado
    expect(processados).toEqual(['evt-duplicado'])
    const [final] = await linhas('evt-duplicado')
    expect(final).toMatchObject({ estado: 'processado', tentativas: 1 })
  })

  it('assinatura inválida: 401, nada persistido, nada enfileirado', async () => {
    const antes = await contarJobs(banco.db, INBOX_PROCESS_QUEUE.name)
    const resposta = await receber(JSON.stringify({ id: 'evt-forjado' }), { 'x-token': 'errado' })
    expect(resposta.status).toBe(401)
    expect(await linhas('evt-forjado')).toHaveLength(0)
    expect(await contarJobs(banco.db, INBOX_PROCESS_QUEUE.name)).toBe(antes)
  })

  it('corpo acima do limite: 413 (pelo content-length e pelo fluxo), nada persistido', async () => {
    const grande = JSON.stringify({ id: 'evt-grande', lixo: 'x'.repeat(MAX_WEBHOOK_BODY_BYTES) })
    const resposta = await receber(grande)
    expect(resposta.status).toBe(413)
    expect(await linhas('evt-grande')).toHaveLength(0)

    // Sem content-length confiável: o limite vale na leitura do fluxo.
    const fluxo = new Request('https://app.exemplo.test/x', {
      method: 'POST',
      headers: { 'x-token': SEGREDO },
      body: new ReadableStream({
        start(controle) {
          controle.enqueue(new TextEncoder().encode('a'.repeat(2000)))
          controle.close()
        },
      }),
      // @ts-expect-error duplex é exigido pelo Node para corpo em fluxo
      duplex: 'half',
    })
    const resposta2 = await receiveWebhook(fluxo, adapter, {
      barbeariaId: banco.barbearia.id,
      maxBodyBytes: 1000,
    })
    expect(resposta2.status).toBe(413)
  })

  it('corpo verificado mas ilegível: 400, nada persistido', async () => {
    const resposta = await receber('{sem-json')
    expect(resposta.status).toBe(400)
  })

  it('falha ao persistir NÃO responde sucesso (503): o provedor vai reenviar', async () => {
    const dbQuebrado = {
      transaction: () => Promise.reject(new Error('banco indisponível')),
    } as unknown as Db
    const resposta = await receber(JSON.stringify({ id: 'evt-sem-banco' }), undefined, {
      db: dbQuebrado,
    })
    expect(resposta.status).toBe(503)
    expect(await linhas('evt-sem-banco')).toHaveLength(0)
  })

  it('número de cartão no corpo não é gravado (hash é do corpo original)', async () => {
    const corpo = JSON.stringify({
      id: 'evt-cartao',
      obs: 'pago com 4111 1111 1111 1111 hoje',
      pedido: 20271234,
    })
    await receber(corpo)
    const [linha] = await linhas('evt-cartao')
    expect(linha?.corpo).toContain(CARD_REMOVED)
    expect(linha?.corpo).not.toContain('4111')
    expect(linha?.corpo).toContain('20271234')
    expect(linha?.hashCorpo).toBe(sha256Hex(corpo))
  })

  it('falha transitória volta a `recebido`; esgotada ou permanente vira `falhou`; reprocessar exige motivo e preserva o original', async () => {
    let modo: 'transitoria' | 'permanente' | 'ok' = 'transitoria'
    registerInboxHandler('provedor-teste', () => {
      if (modo === 'transitoria') return Promise.reject(new Error('API do provedor caiu'))
      if (modo === 'permanente') return Promise.reject(new PermanentJobError('credencial inválida'))
      return Promise.resolve()
    })
    const corpo = JSON.stringify({ id: 'evt-reprocessa' })
    await receber(corpo)
    const [original] = await linhas('evt-reprocessa')
    const id = original?.id ?? ''
    const ctx = banco.contexto({ atorId: null })

    await expect(processInboxRecord(id, ctx, 0)).rejects.toThrow('API do provedor caiu')
    expect((await linhas('evt-reprocessa'))[0]).toMatchObject({ estado: 'recebido', tentativas: 1 })

    modo = 'permanente'
    await expect(processInboxRecord(id, ctx, 1)).rejects.toThrow('credencial inválida')
    expect((await linhas('evt-reprocessa'))[0]).toMatchObject({ estado: 'falhou', tentativas: 2 })

    await expect(
      reprocessInboxRecord({ inboxId: id, reason: '   ', requestedBy: 'admin' }),
    ).rejects.toThrow(/motivo/)

    modo = 'ok'
    // Em produção o worker já consumiu o job original; aqui o removemos para não deduplicar o novo.
    await banco.db.execute(
      sql`delete from pgboss.job where name = ${INBOX_PROCESS_QUEUE.name} and singleton_key = ${'inbox:' + id}`,
    )
    const jobsAntes = await contarJobs(banco.db, INBOX_PROCESS_QUEUE.name)
    await reprocessInboxRecord({
      inboxId: id,
      reason: 'credencial corrigida',
      requestedBy: 'admin',
    })
    expect(await contarJobs(banco.db, INBOX_PROCESS_QUEUE.name)).toBe(jobsAntes + 1)
    const [reaberto] = await linhas('evt-reprocessa')
    expect(reaberto).toMatchObject({ estado: 'recebido', reprocessamentos: 1 })
    // Registro original intacto.
    expect(reaberto).toMatchObject({
      corpo,
      hashCorpo: original?.hashCorpo,
      recebidoEm: original?.recebidoEm,
      id,
    })

    await processInboxRecord(id, ctx, 0)
    expect((await linhas('evt-reprocessa'))[0]?.estado).toBe('processado')

    const auditoria = await banco.db.execute(
      sql`select motivo from auditoria where recurso_id = ${id} and acao = 'inbox.reprocess'`,
    )
    expect(auditoria.rows).toEqual([{ motivo: 'credencial corrigida' }])
  })

  it('sem handler para o provedor: erro permanente (vira pendência), não loop', async () => {
    await receber(JSON.stringify({ id: 'evt-sem-handler' }))
    const [linha] = await linhas('evt-sem-handler')
    await expect(
      processInboxRecord(linha?.id ?? '', banco.contexto({ atorId: null }), 0),
    ).rejects.toBeInstanceOf(PermanentJobError)
    expect((await linhas('evt-sem-handler'))[0]?.estado).toBe('falhou')
  })
})
