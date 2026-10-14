import { eq, sql } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  advanceOperation,
  defineExternalOperation,
  ExternalNotAppliedError,
  resetExternalOperations,
  runExternalOperation,
  type ReconcileOutcome,
} from '../../src/platform/external-ops'
import { externalOperationJobKey, EXTERNAL_OPS_QUEUE } from '../../src/platform/external-ops/run'
import { operacoesExternas } from '../../src/platform/external-ops/schema'
import { setDeadLetterHook, type DeadLetterEvent } from '../../src/platform/jobs/dead-letter'
import { resetJobHandlers } from '../../src/platform/jobs/handlers'
import { PermanentJobError } from '../../src/platform/jobs/failures'
import { startWorker, type RunningWorker } from '../../src/platform/jobs/worker'
import { setRecoveryMode } from '../../src/platform/recovery'
import { abrirBancoDeTeste, type BancoDeTeste } from './helpers/banco'
import { contarJobs, encerrarBoss, esperarAte, prepararBoss } from './helpers/jobs'

/** Provedor simulado: guarda o que "aplicou" e quantas chamadas recebeu. */
class ProvedorFalso {
  chamadas = 0
  reconciliacoes = 0
  aplicado = new Map<string, string>()
  /** O que a próxima chamada faz: aplica e responde, aplica e "trava", ou falha. */
  modo: 'ok' | 'aplica-e-trava' | 'nao-aplica-e-falha' | 'recusa-429' | 'config-invalida' = 'ok'
  respostaDaReconciliacao: 'consulta' | 'unknown' | 'not_applied' = 'consulta'

  async cobrar(chave: string): Promise<{ cobrancaId: string }> {
    this.chamadas += 1
    if (this.modo === 'config-invalida')
      throw new PermanentJobError('401 do provedor: credencial inválida')
    if (this.modo === 'recusa-429')
      throw new ExternalNotAppliedError('429 do provedor', { retryAfterMs: 1000 })
    if (this.modo === 'nao-aplica-e-falha') throw new Error('ECONNRESET antes de enviar')
    this.aplicado.set(chave, `cob-${chave}`)
    if (this.modo === 'aplica-e-trava') await new Promise(() => undefined) // o provedor aplicou, mas a resposta nunca chega
    return { cobrancaId: `cob-${chave}` }
  }

  reconciliar(chave: string): ReconcileOutcome<{ cobrancaId: string }> {
    this.reconciliacoes += 1
    if (this.respostaDaReconciliacao === 'unknown') return { outcome: 'unknown' }
    if (this.respostaDaReconciliacao === 'not_applied') return { outcome: 'not_applied' }
    const id = this.aplicado.get(chave)
    return id ? { outcome: 'applied', result: { cobrancaId: id } } : { outcome: 'not_applied' }
  }
}

describe('operações externas (intenção → commit → chamada → registro)', () => {
  let banco: BancoDeTeste
  let provedor: ProvedorFalso
  let worker: RunningWorker | undefined
  let contador = 0
  const pendencias: DeadLetterEvent[] = []

  beforeAll(async () => {
    banco = await abrirBancoDeTeste()
    await prepararBoss()
  })

  afterAll(async () => {
    await encerrarBoss()
    await banco.encerrar()
  })

  beforeEach(() => {
    provedor = new ProvedorFalso()
    pendencias.length = 0
    setDeadLetterHook((e) => {
      pendencias.push(e)
      return Promise.resolve()
    })
  })

  afterEach(async () => {
    await worker?.stop(5_000)
    worker = undefined
    resetExternalOperations()
    resetJobHandlers()
    setDeadLetterHook(undefined)
  })

  function definirCobranca(opcoes: { semReconcile?: boolean; timeoutMs?: number } = {}) {
    contador += 1
    return defineExternalOperation<{ chave: string }, { cobrancaId: string }>({
      type: `teste.cobranca-${contador}`,
      timeoutMs: opcoes.timeoutMs ?? 40,
      retry: { delaysMs: [0], jitterRatio: 0 },
      execute: (entrada, chamada) => provedor.cobrar(chamada.idempotencyKey || entrada.chave),
      ...(opcoes.semReconcile
        ? {}
        : {
            reconcile: (entrada: { chave: string }) =>
              Promise.resolve(provedor.reconciliar(entrada.chave)),
          }),
    })
  }

  const pedido = (chave: string) => ({
    idempotencyKey: chave,
    target: `assinatura:${chave}`,
    input: { chave },
  })
  const linha = async (chave: string) =>
    (
      await banco.db
        .select()
        .from(operacoesExternas)
        .where(eq(operacoesExternas.chaveIdempotente, chave))
    )[0]
  const jobDeContinuacao = async (id: string) => {
    const resultado = await banco.db.execute(
      sql`select count(*)::int as total from pgboss.job where name = ${EXTERNAL_OPS_QUEUE.name} and singleton_key = ${externalOperationJobKey(id)} and state::text in ('created', 'retry')`,
    )
    return Number((resultado.rows[0] as { total: number }).total)
  }
  const jobAguardandoDeContinuacao = async (id: string) => {
    const resultado = await banco.db.execute(
      sql`select id, state::text as state, start_after from pgboss.job where name = ${EXTERNAL_OPS_QUEUE.name} and singleton_key = ${externalOperationJobKey(id)} and state::text = 'created' order by created_on desc limit 1`,
    )
    return resultado.rows[0] as
      { id: string; state: string; start_after: Date | string } | undefined
  }
  const estadoDoJob = async (jobId: string) => {
    const resultado = await banco.db.execute(
      sql`select state::text as state from pgboss.job where id = ${jobId}`,
    )
    return (resultado.rows[0] as { state: string } | undefined)?.state
  }
  const iniciarWorker = async () => {
    await encerrarBoss()
    await prepararBoss()
    worker = await startWorker({
      barbeariaId: banco.barbearia.id,
      clock: banco.clock,
      loadModules: false,
      queueNames: [EXTERNAL_OPS_QUEUE.name],
      pollingIntervalSeconds: 0.5,
    })
  }

  it('caminho feliz: persiste a intenção, chama uma vez e confirma; repetir a chave não chama de novo', async () => {
    const definicao = definirCobranca()
    const ctx = banco.contexto({ atorId: null })
    const primeira = await runExternalOperation(ctx, definicao, pedido('ok-1'))
    expect(primeira).toMatchObject({ status: 'confirmada', result: { cobrancaId: 'cob-ok-1' } })
    const segunda = await runExternalOperation(ctx, definicao, pedido('ok-1'))
    expect(segunda).toMatchObject({ status: 'confirmada', result: { cobrancaId: 'cob-ok-1' } })
    expect(provedor.chamadas).toBe(1)
    expect(await jobDeContinuacao(primeira.operationId)).toBe(1)
    expect(await linha('ok-1')).toMatchObject({
      estado: 'confirmada',
      tentativas: 1,
      alvo: 'assinatura:ok-1',
    })
  })

  it('o watchdog de uma operação terminal conclui sem chamar o provedor de novo', async () => {
    const definicao = definirCobranca()
    const ctx = banco.contexto({ atorId: null })
    const resultado = await runExternalOperation(ctx, definicao, pedido('terminal-watchdog-1'))
    const job = await jobAguardandoDeContinuacao(resultado.operationId)
    expect(job).toMatchObject({ state: 'created' })

    await iniciarWorker()
    await banco.db.execute(sql`update pgboss.job set start_after = now() where id = ${job?.id}`)
    await esperarAte(async () => (await estadoDoJob(job?.id ?? '')) === 'completed')

    expect(await linha('terminal-watchdog-1')).toMatchObject({ estado: 'confirmada' })
    expect(provedor.chamadas).toBe(1)
  })

  it('a intenção está commitada ANTES da chamada (visível por outra conexão durante a chamada)', async () => {
    contador += 1
    let estadoDuranteAChamada: string | undefined
    const definicao = defineExternalOperation<{ chave: string }, { ok: true }>({
      type: `teste.intencao-${contador}`,
      execute: async () => {
        estadoDuranteAChamada = (await linha('intencao-1'))?.estado // outra conexão do pool
        return { ok: true }
      },
    })
    await runExternalOperation(banco.contexto({ atorId: null }), definicao, pedido('intencao-1'))
    expect(estadoDuranteAChamada).toBe('em_andamento')
  })

  it('timeout depois de sucesso simulado → incerta → reconciliação encontra o sucesso → confirmada sem segunda chamada', async () => {
    const definicao = definirCobranca()
    provedor.modo = 'aplica-e-trava'
    const ctx = banco.contexto({ atorId: null })

    const resultado = await runExternalOperation(ctx, definicao, pedido('timeout-1'))
    expect(resultado.status).toBe('incerta')
    const incerta = await linha('timeout-1')
    expect(incerta?.estado).toBe('incerta')
    expect(provedor.chamadas).toBe(1)
    expect(await jobDeContinuacao(incerta?.id ?? '')).toBe(1) // job de reconciliação agendado na mesma transação

    // O job de reconciliação (aqui chamado direto, como o worker faria) pergunta ao provedor ANTES de repetir.
    const reconciliada = await advanceOperation(ctx, definicao, incerta?.id ?? '')
    expect(reconciliada).toMatchObject({
      status: 'confirmada',
      result: { cobrancaId: 'cob-timeout-1' },
    })
    expect(provedor.reconciliacoes).toBe(1)
    expect(provedor.chamadas).toBe(1) // nenhuma segunda chamada
    expect(await linha('timeout-1')).toMatchObject({ estado: 'confirmada', tentativas: 1 })
  })

  it('reconciliação diz que NÃO foi aplicada → só então repete, com a mesma chave de idempotência', async () => {
    const definicao = definirCobranca()
    const chavesVistas: string[] = []
    contador += 1
    const comChave = defineExternalOperation<{ chave: string }, { cobrancaId: string }>({
      type: `teste.cobranca-chave-${contador}`,
      timeoutMs: 40,
      execute: async (entrada, chamada) => {
        chavesVistas.push(chamada.idempotencyKey)
        return provedor.cobrar(entrada.chave)
      },
      reconcile: (entrada) => Promise.resolve(provedor.reconciliar(entrada.chave)),
    })
    void definicao
    provedor.modo = 'nao-aplica-e-falha'
    const ctx = banco.contexto({ atorId: null })
    const primeira = await runExternalOperation(ctx, comChave, pedido('nao-aplicada-1'))
    expect(primeira.status).toBe('incerta')
    const id = (await linha('nao-aplicada-1'))?.id ?? ''

    provedor.modo = 'ok'
    const final = await advanceOperation(ctx, comChave, id)
    expect(final.status).toBe('confirmada')
    expect(provedor.chamadas).toBe(2)
    expect(provedor.reconciliacoes).toBe(1)
    expect(chavesVistas).toEqual(['nao-aplicada-1', 'nao-aplicada-1'])
    expect(await linha('nao-aplicada-1')).toMatchObject({ estado: 'confirmada', tentativas: 2 })
  })

  it('reconciliação sem resposta conclusiva mantém `incerta` e reagenda; nunca repete às cegas', async () => {
    const definicao = definirCobranca()
    provedor.modo = 'aplica-e-trava'
    provedor.respostaDaReconciliacao = 'unknown'
    const ctx = banco.contexto({ atorId: null })
    await runExternalOperation(ctx, definicao, pedido('unknown-1'))
    const id = (await linha('unknown-1'))?.id ?? ''
    const resultado = await advanceOperation(ctx, definicao, id)
    expect(resultado.status).toBe('incerta')
    expect(provedor.chamadas).toBe(1)
    expect(await linha('unknown-1')).toMatchObject({ estado: 'incerta', reconciliacoes: 1 })
  })

  it('sem reconcile definido, incerta nunca é repetida sozinha e abre pendência', async () => {
    const definicao = definirCobranca({ semReconcile: true })
    provedor.modo = 'aplica-e-trava'
    const ctx = banco.contexto({ atorId: null })
    const resultado = await runExternalOperation(ctx, definicao, pedido('sem-reconcile-1'))
    expect(resultado.status).toBe('incerta')
    expect(pendencias).toMatchObject([{ source: 'external-op', reason: 'exhausted' }])
    const id = (await linha('sem-reconcile-1'))?.id ?? ''
    expect((await advanceOperation(ctx, definicao, id)).status).toBe('incerta')
    expect(provedor.chamadas).toBe(1)
  })

  it('erro permanente (configuração) vai direto para falhou + pendência, sem job de repetição', async () => {
    const definicao = definirCobranca()
    provedor.modo = 'config-invalida'
    const resultado = await runExternalOperation(
      banco.contexto({ atorId: null }),
      definicao,
      pedido('permanente-1'),
    )
    expect(resultado.status).toBe('falhou')
    const registro = await linha('permanente-1')
    expect(registro).toMatchObject({ estado: 'falhou' })
    expect(registro?.ultimoErro).toContain('credencial inválida')
    expect(pendencias).toMatchObject([{ reason: 'permanent', ref: registro?.id }])
    expect(await jobDeContinuacao(registro?.id ?? '')).toBe(1) // apenas o watchdog criado ao entrar em andamento
    expect(provedor.chamadas).toBe(1)
  })

  it('falha definitiva retentável (429): volta a pendente com job agendado e depois confirma', async () => {
    const definicao = definirCobranca()
    provedor.modo = 'recusa-429'
    const ctx = banco.contexto({ atorId: null })
    const primeira = await runExternalOperation(ctx, definicao, pedido('429-1'))
    expect(primeira.status).toBe('pendente')
    const registro = await linha('429-1')
    expect(await jobDeContinuacao(registro?.id ?? '')).toBe(1)

    provedor.modo = 'ok'
    const segunda = await advanceOperation(ctx, definicao, registro?.id ?? '')
    expect(segunda.status).toBe('confirmada')
    expect(provedor.chamadas).toBe(2)
  })

  it('mesma chave com outro alvo ou entrada é recusada (IDEMPOTENCY.KEY_REUSED)', async () => {
    const definicao = definirCobranca()
    const ctx = banco.contexto({ atorId: null })
    await runExternalOperation(ctx, definicao, pedido('reuso-1'))
    await expect(
      runExternalOperation(ctx, definicao, { ...pedido('reuso-1'), input: { chave: 'outra' } }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY.KEY_REUSED' })
    expect(provedor.chamadas).toBe(1)
  })

  it('segunda execução da mesma intenção durante a chamada não chama o provedor (em_andamento)', async () => {
    contador += 1
    let liberar: () => void = () => undefined
    const trava = new Promise<void>((resolver) => {
      liberar = resolver
    })
    const definicao = defineExternalOperation<{ chave: string }, { cobrancaId: string }>({
      type: `teste.simultanea-${contador}`,
      timeoutMs: 20_000,
      execute: async (entrada) => {
        await trava
        return provedor.cobrar(entrada.chave)
      },
    })
    const ctx = banco.contexto({ atorId: null })
    const primeira = runExternalOperation(ctx, definicao, pedido('simultanea-1'))
    await esperarAte(async () => (await linha('simultanea-1'))?.estado === 'em_andamento')

    const segunda = await runExternalOperation(ctx, definicao, pedido('simultanea-1'))
    expect(segunda.status).toBe('em_andamento')
    liberar()
    expect((await primeira).status).toBe('confirmada')
    expect(provedor.chamadas).toBe(1)
  })

  it('chamador que morreu no meio (em_andamento abandonada) é tratado como incerta e reconciliado', async () => {
    const definicao = definirCobranca()
    const ctx = banco.contexto({ atorId: null })
    provedor.aplicado.set('abandonada-1', 'cob-abandonada-1') // o provedor chegou a aplicar
    const agora = ctx.clock.now()
    await banco.db.insert(operacoesExternas).values({
      barbeariaId: ctx.barbeariaId,
      tipo: definicao.type,
      chaveIdempotente: 'abandonada-1',
      alvo: 'assinatura:abandonada-1',
      entrada: { chave: 'abandonada-1' },
      estado: 'em_andamento',
      tentativas: 1,
      iniciadaEm: new Date(agora.getTime() - 10 * 60_000),
    })
    const id = (await linha('abandonada-1'))?.id ?? ''
    const resultado = await advanceOperation(ctx, definicao, id)
    expect(resultado).toMatchObject({
      status: 'confirmada',
      result: { cobrancaId: 'cob-abandonada-1' },
    })
    expect(provedor.chamadas).toBe(0)
  })

  it('agenda reconciliação ao entrar em andamento antes de registrar o retorno do chamador', async () => {
    let liberarChamada: (() => void) | undefined
    let sinalizarInicio: (() => void) | undefined
    const chamadaIniciada = new Promise<void>((resolver) => {
      sinalizarInicio = resolver
    })
    const resposta = new Promise<{ cobrancaId: string }>((resolver) => {
      liberarChamada = () => resolver({ cobrancaId: 'cob-abandonada-antes-registro' })
    })
    const definicao = defineExternalOperation<{ chave: string }, { cobrancaId: string }>({
      type: `teste.abandonada-antes-registro-${++contador}`,
      timeoutMs: 120_000,
      execute: async (entrada) => {
        provedor.chamadas += 1
        provedor.aplicado.set(entrada.chave, 'cob-abandonada-antes-registro')
        sinalizarInicio?.()
        return resposta
      },
      reconcile: (entrada) => Promise.resolve(provedor.reconciliar(entrada.chave)),
    })
    const ctx = banco.contexto({ atorId: null })
    const chamador = runExternalOperation(ctx, definicao, pedido('abandonada-antes-registro-1'))
    await chamadaIniciada
    const registro = await linha('abandonada-antes-registro-1')
    expect(registro).toMatchObject({ estado: 'em_andamento' })
    const watchdog = await jobAguardandoDeContinuacao(registro?.id ?? '')
    expect(watchdog).toMatchObject({ state: 'created' })
    expect(new Date(watchdog?.start_after ?? 0).getTime()).toBe(
      ctx.clock.now().getTime() + definicao.timeoutMs + 60_000,
    )

    await iniciarWorker()
    banco.clock.advance(definicao.timeoutMs + 60_000)
    await banco.db.execute(
      sql`update pgboss.job set start_after = now() where id = ${watchdog?.id}`,
    )
    await esperarAte(async () => (await estadoDoJob(watchdog?.id ?? '')) === 'completed')

    expect(await linha('abandonada-antes-registro-1')).toMatchObject({ estado: 'confirmada' })
    expect(provedor.chamadas).toBe(1)
    expect(provedor.reconciliacoes).toBe(1)
    liberarChamada?.()
    expect((await chamador).status).toBe('confirmada')
    expect(provedor.chamadas).toBe(1)
  })

  it('modo recuperação recusa a operação externa antes de persistir ou chamar', async () => {
    const definicao = definirCobranca()
    const ctx = banco.contexto({ atorId: null })
    await setRecoveryMode(ctx, { active: true, operator: 'teste', reason: 'restore simulado' })
    try {
      await expect(
        runExternalOperation(ctx, definicao, pedido('recuperacao-1')),
      ).rejects.toMatchObject({
        code: 'SYSTEM.RECOVERY_MODE',
        httpStatus: 503,
      })
      expect(provedor.chamadas).toBe(0)
      expect(await linha('recuperacao-1')).toBeUndefined()
    } finally {
      await setRecoveryMode(ctx, { active: false, operator: 'teste', reason: 'fim do teste' })
    }
    const liberada = await runExternalOperation(ctx, definicao, pedido('recuperacao-1'))
    expect(liberada.status).toBe('confirmada')
  })

  it('o job de operações externas não toca o provedor em modo recuperação (conta jobs de continuação)', async () => {
    // Garantia estrutural: a fila é de efeito externo e, portanto, adiada pelo runtime (coberto em recuperacao.test.ts).
    expect(EXTERNAL_OPS_QUEUE.externalEffect).toBe(true)
    expect(await contarJobs(banco.db, EXTERNAL_OPS_QUEUE.name)).toBeGreaterThan(0)
  })
})
