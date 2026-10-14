import { sql } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { executeJob, type JobRuntime } from '../../src/platform/jobs/handlers'
import { defineQueue } from '../../src/platform/jobs/queues'
import {
  assertNotRecoveryMode,
  getRecoveryStatus,
  isRecoveryMode,
  setRecoveryMode,
} from '../../src/platform/recovery'
import { abrirBancoDeTeste, type BancoDeTeste } from './helpers/banco'
import { filaUnica } from './helpers/jobs'

describe('modo recuperação (D0078)', () => {
  let banco: BancoDeTeste

  beforeAll(async () => {
    banco = await abrirBancoDeTeste()
  })

  afterAll(async () => {
    await banco.encerrar()
  })

  afterEach(async () => {
    await setRecoveryMode(banco.contexto({ atorId: null }), {
      active: false,
      operator: 'teste',
      reason: 'limpeza',
    })
  })

  it('começa desligado; ligar e desligar registram operador, motivo e ponto restaurado, e vão para a auditoria', async () => {
    const ctx = banco.contexto({ atorId: null })
    expect(await isRecoveryMode(ctx)).toBe(false)

    const ponto = new Date('2027-01-30T03:00:00Z')
    const ligado = await setRecoveryMode(ctx, {
      active: true,
      operator: 'operador-1',
      reason: 'restore do backup de 30/01',
      restoredPoint: ponto,
    })
    expect(ligado).toMatchObject({
      active: true,
      activatedBy: 'operador-1',
      reason: 'restore do backup de 30/01',
    })
    expect(ligado.restoredPoint?.toISOString()).toBe(ponto.toISOString())
    expect(await isRecoveryMode(ctx)).toBe(true)
    await expect(assertNotRecoveryMode(ctx)).rejects.toMatchObject({
      code: 'SYSTEM.RECOVERY_MODE',
      httpStatus: 503,
    })

    const desligado = await setRecoveryMode(ctx, {
      active: false,
      operator: 'operador-1',
      reason: 'conciliação concluída e autorizada',
    })
    expect(desligado.active).toBe(false)
    expect(desligado.restoredPoint?.toISOString()).toBe(ponto.toISOString()) // o ponto restaurado fica registrado
    await expect(assertNotRecoveryMode(ctx)).resolves.toBeUndefined()

    const auditoria = await banco.db.execute(
      sql`select acao, motivo from auditoria where recurso_id = ${ctx.barbeariaId} and acao like 'recovery.%' order by ocorrida_em, id`,
    )
    expect(auditoria.rows.slice(-2)).toEqual([
      { acao: 'recovery.activate', motivo: 'restore do backup de 30/01' },
      { acao: 'recovery.deactivate', motivo: 'conciliação concluída e autorizada' },
    ])
  })

  it('exige motivo e operador', async () => {
    const ctx = banco.contexto({ atorId: null })
    await expect(
      setRecoveryMode(ctx, { active: true, operator: 'x', reason: '  ' }),
    ).rejects.toThrow(/motivo/)
    await expect(setRecoveryMode(ctx, { active: true, operator: '', reason: 'y' })).rejects.toThrow(
      /operador/,
    )
    expect((await getRecoveryStatus(ctx)).active).toBe(false)
  })

  it('o estado é por barbearia: outra barbearia não é afetada', async () => {
    const ctx = banco.contexto({ atorId: null })
    await setRecoveryMode(ctx, { active: true, operator: 'x', reason: 'teste' })
    expect(await isRecoveryMode({ barbeariaId: '019a0000-0000-7000-8000-000000000000' })).toBe(
      false,
    )
  })

  describe('jobs de efeito externo', () => {
    function runtimeDeTeste(reenvios: Array<{ startAfter: Date; attempt: number }>): JobRuntime {
      const ctx = banco.contexto({ atorId: null })
      return {
        clock: banco.clock,
        random: () => 0.5,
        context: () => ctx,
        isRecoveryMode: () => isRecoveryMode(ctx),
        resend: ({ envelope, startAfter }) => {
          reenvios.push({ startAfter, attempt: envelope.attempt })
          return Promise.resolve()
        },
      }
    }
    const envelope = (queue: string) => ({
      v: 1 as const,
      queue,
      payload: {},
      correlationId: 'corr-recuperacao',
      attempt: 0,
    })

    it('job de efeito externo é pausado (adiado) em modo recuperação e roda quando o operador libera', async () => {
      const efeito = defineQueue({ name: filaUnica('rec-efeito'), externalEffect: true })
      let execucoes = 0
      const registrado = {
        definicao: efeito,
        handler: () => {
          execucoes += 1
          return Promise.resolve()
        },
      }
      const reenvios: Array<{ startAfter: Date; attempt: number }> = []
      const runtime = runtimeDeTeste(reenvios)
      const ctx = banco.contexto({ atorId: null })

      await setRecoveryMode(ctx, { active: true, operator: 'x', reason: 'restore' })
      await executeJob(registrado, { id: 'j1', singletonKey: null }, envelope(efeito.name), runtime)
      expect(execucoes).toBe(0)
      expect(reenvios).toHaveLength(1)
      expect(reenvios[0]?.attempt).toBe(0) // adiar não consome retentativa
      expect(reenvios[0]?.startAfter.getTime()).toBeGreaterThan(banco.clock.now().getTime())

      await setRecoveryMode(ctx, { active: false, operator: 'x', reason: 'liberado' })
      await executeJob(registrado, { id: 'j1', singletonKey: null }, envelope(efeito.name), runtime)
      expect(execucoes).toBe(1)
    })

    it('job sem efeito externo continua rodando em modo recuperação', async () => {
      const interno = defineQueue({ name: filaUnica('rec-interno') })
      let execucoes = 0
      const reenvios: Array<{ startAfter: Date; attempt: number }> = []
      await setRecoveryMode(banco.contexto({ atorId: null }), {
        active: true,
        operator: 'x',
        reason: 'restore',
      })
      await executeJob(
        {
          definicao: interno,
          handler: () => {
            execucoes += 1
            return Promise.resolve()
          },
        },
        { id: 'j2', singletonKey: null },
        envelope(interno.name),
        runtimeDeTeste(reenvios),
      )
      expect(execucoes).toBe(1)
      expect(reenvios).toHaveLength(0)
    })

    it('handler que lança RECOVERY_MODE (ex.: adapter) também é adiado, sem virar falha', async () => {
      const fila = defineQueue({ name: filaUnica('rec-lanca') })
      const reenvios: Array<{ startAfter: Date; attempt: number }> = []
      await executeJob(
        {
          definicao: fila,
          handler: async () => {
            await assertNotRecoveryMode(banco.contexto({ atorId: null }))
          },
        },
        { id: 'j3', singletonKey: null },
        envelope(fila.name),
        { ...runtimeDeTeste(reenvios), isRecoveryMode: () => Promise.resolve(false) },
      ).catch(() => undefined)
      // Sem modo recuperação ativo o handler passa: nada reenviado.
      expect(reenvios).toHaveLength(0)

      await setRecoveryMode(banco.contexto({ atorId: null }), {
        active: true,
        operator: 'x',
        reason: 'restore',
      })
      await executeJob(
        {
          definicao: fila,
          handler: async () => {
            await assertNotRecoveryMode(banco.contexto({ atorId: null }))
          },
        },
        { id: 'j3', singletonKey: null },
        envelope(fila.name),
        { ...runtimeDeTeste(reenvios), isRecoveryMode: () => Promise.resolve(false) },
      )
      expect(reenvios).toHaveLength(1)
      expect(reenvios[0]?.attempt).toBe(0)
    })
  })
})
