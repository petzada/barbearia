import { describe, expect, it } from 'vitest'
import {
  FakeAuditWriter,
  FakeJobQueue,
  FakeMetricsSink,
  FakeNotificationProvider,
  FakeOutbox,
  FakePaymentProvider,
  FakePushProvider,
  FakeSessionResolver,
  FakeStorageProvider,
} from '~/contracts/fakes'
import {
  correlationIdFromHeader,
  createRequestContext,
  createSystemContext,
  defineEvent,
} from '~/platform/context'
import { isUuidV7 } from '~/platform/ids'
import { createManualClock } from '~/platform/time'

const relogio = createManualClock('2027-01-31T15:00:00Z')

describe('contexto da requisição (PRD §7.3)', () => {
  it('traz barbearia do deploy, ator, papéis, sessão, authTime, correlationId e clock', () => {
    const authTime = new Date('2027-01-31T14:00:00Z')
    const ctx = createRequestContext({
      barbeariaId: 'b1',
      clock: relogio,
      correlationId: 'corr-fixo-123',
      session: { actorId: 'u1', roles: ['admin', 'barbeiro'], sessionId: 's1', authTime },
    })
    expect(ctx).toMatchObject({
      barbeariaId: 'b1',
      actorId: 'u1',
      roles: ['admin', 'barbeiro'],
      sessionId: 's1',
      authTime,
      correlationId: 'corr-fixo-123',
    })
    expect(ctx.clock.now().toISOString()).toBe('2027-01-31T15:00:00.000Z')
  })

  it('contexto de sistema não tem ator, sessão nem papéis', () => {
    const ctx = createSystemContext({ barbeariaId: 'b1', clock: relogio })
    expect(ctx).toMatchObject({ actorId: null, sessionId: null, authTime: null, roles: [] })
    expect(isUuidV7(ctx.correlationId)).toBe(true)
  })

  it('x-correlation-id só é aceito com formato seguro', () => {
    expect(correlationIdFromHeader('req-ABC_123456')).toBe('req-ABC_123456')
    expect(isUuidV7(correlationIdFromHeader('curto'))).toBe(true)
    expect(isUuidV7(correlationIdFromHeader('com espaço e <tag>'))).toBe(true)
    expect(isUuidV7(correlationIdFromHeader(null))).toBe(true)
  })
})

describe('envelope de evento de domínio (PRD §7.3)', () => {
  const ReservationConfirmed = defineEvent<'ReservationConfirmed', { reservaId: string }>(
    'ReservationConfirmed',
    1,
  )

  it('cria o envelope completo a partir do contexto', () => {
    const ctx = createRequestContext({
      barbeariaId: 'b1',
      clock: relogio,
      correlationId: 'corr-evento-1',
    })
    const evento = ReservationConfirmed.create(ctx, {
      aggregateId: 'r1',
      aggregateRevision: 2,
      payload: { reservaId: 'r1' },
    })
    expect(evento).toMatchObject({
      type: 'ReservationConfirmed',
      version: 1,
      barbeariaId: 'b1',
      aggregateId: 'r1',
      aggregateRevision: 2,
      correlationId: 'corr-evento-1',
      payload: { reservaId: 'r1' },
    })
    expect(isUuidV7(evento.id)).toBe(true)
    expect(evento.occurredAt.toISOString()).toBe('2027-01-31T15:00:00.000Z')
  })

  it('valida nome e versão', () => {
    expect(() => defineEvent('reservation_confirmed', 1)).toThrow()
    expect(() => defineEvent('Valido', 0)).toThrow()
  })
})

describe('fakes dos ports', () => {
  it('FakeJobQueue deduplica por singletonKey e cancela por chave', async () => {
    const fila = new FakeJobQueue()
    const a = await fila.enqueue({ queue: 'lembretes', payload: 1, singletonKey: 'r1' })
    const b = await fila.enqueue({ queue: 'lembretes', payload: 2, singletonKey: 'r1' })
    expect(a.jobId).not.toBeNull()
    expect(b.jobId).toBeNull()
    await fila.cancelByKey({ queue: 'lembretes', singletonKey: 'r1' })
    expect(fila.jobs).toHaveLength(0)
  })

  it('FakeOutbox e FakeAuditWriter registram na ordem', async () => {
    const outbox = new FakeOutbox()
    const ctx = createRequestContext({
      barbeariaId: 'b1',
      clock: relogio,
      correlationId: 'corr-fake-12',
    })
    const evento = defineEvent<'X', null>('X', 1).create(ctx, {
      aggregateId: 'a',
      aggregateRevision: 1,
      payload: null,
    })
    await outbox.publishInTx(undefined, evento)
    expect(outbox.events).toEqual([evento])
    const auditoria = new FakeAuditWriter()
    await auditoria.record(undefined, ctx, { action: 'x.y', resource: { type: 'x', id: '1' } })
    expect(auditoria.entries[0]).toMatchObject({ action: 'x.y', correlationId: 'corr-fake-12' })
  })

  it('FakePaymentProvider cria a recorrência uma vez por assinatura e repete a devolução por chave', async () => {
    const provedor = new FakePaymentProvider()
    const entrada = {
      assinaturaId: 'a1',
      amountCentavos: 12990,
      startsAt: relogio.now(),
      idempotencyKey: 'k1-12345',
    }
    const r1 = await provedor.createRecurring(entrada)
    const r2 = await provedor.createRecurring(entrada)
    expect(r2.ref.id).toBe(r1.ref.id)
    expect((await provedor.findRecurringByReference('a1'))?.ref.id).toBe(r1.ref.id)
    expect(provedor.capabilities.changeNextChargeDate).toBe('nao_verificado')
    const d1 = await provedor.refund(r1.ref, 'chave-devolucao')
    const d2 = await provedor.refund(r1.ref, 'chave-devolucao')
    expect(d2).toEqual(d1)
    expect((await provedor.cancelRecurring(r1.ref)).status).toBe('canceled')
  })

  it('FakeNotificationProvider não reenvia a mesma chave; falha simulada não consome a chave', async () => {
    const canal = new FakeNotificationProvider()
    const msg = {
      channel: 'avisos' as const,
      toE164: '+5511987654321',
      text: 'oi',
      idempotencyKey: 'k1',
    }
    canal.nextOutcome = { status: 'transient_failure', reason: 'timeout' }
    expect((await canal.send(msg)).status).toBe('transient_failure')
    expect((await canal.send(msg)).status).toBe('sent')
    expect((await canal.send(msg)).status).toBe('sent')
    expect(canal.sent).toHaveLength(1)
  })

  it('FakePushProvider devolve gone para assinatura removida; FakeStorageProvider assina e confirma upload', async () => {
    const push = new FakePushProvider()
    const sub = { endpoint: 'https://push.test/1', keys: { p256dh: 'a', auth: 'b' } }
    expect(await push.send(sub, { type: 'x', id: '1' })).toEqual({ status: 'sent' })
    push.goneEndpoints.add(sub.endpoint)
    expect(await push.send(sub, { type: 'x', id: '1' })).toEqual({ status: 'gone' })

    const storage = new FakeStorageProvider(relogio)
    const url = await storage.createUploadUrl({
      key: 'b/marca/o/1',
      contentType: 'image/png',
      maxBytes: 10,
      expiresInSeconds: 60,
    })
    expect(url.expiresAt.toISOString()).toBe('2027-01-31T15:01:00.000Z')
    expect(await storage.head('b/marca/o/1')).toBeNull()
    storage.simulateUpload('b/marca/o/1', { sizeBytes: 5, contentType: 'image/png' })
    expect(await storage.head('b/marca/o/1')).toEqual({ sizeBytes: 5, contentType: 'image/png' })
  })

  it('FakeMetricsSink e FakeSessionResolver', async () => {
    const metricas = new FakeMetricsSink()
    metricas.record({ name: 'booking_started' })
    expect(metricas.events).toHaveLength(1)
    const resolvedor = new FakeSessionResolver().register('t', {
      actorId: 'u1',
      roles: ['cliente'],
      sessionId: 's',
      authTime: relogio.now(),
    })
    const comToken = new Request('http://x/', { headers: { 'x-test-session': 't' } })
    expect((await resolvedor.resolve(comToken))?.actorId).toBe('u1')
    resolvedor.revoke('t')
    expect(await resolvedor.resolve(comToken)).toBeNull()
    expect(await resolvedor.resolve(new Request('http://x/'))).toBeNull()
  })
})
