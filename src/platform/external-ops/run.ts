import { and, eq, sql } from 'drizzle-orm'
import type { RequestContext } from '~/contracts/context'
import type { JsonValue } from '~/contracts/json'
import type { JobQueue } from '~/contracts/ports/job-queue'
import { getDatabase } from '../db/runtime'
import type { Db, Tx } from '../db/types'
import { IdempotencyErrors } from '../errors/generic'
import { isAppError } from '../errors/app-error'
import { SystemErrors } from '../errors/generic'
import { newId } from '../ids'
import { hashPayload } from '../idempotency/hash'
import { reportDeadLetter, type DeadLetterEvent } from '../jobs/dead-letter'
import { classifyFailure, describeError } from '../jobs/failures'
import { registerJobHandler } from '../jobs/handlers'
import { getJobQueue } from '../jobs/queue'
import { defineQueue } from '../jobs/queues'
import { nextRetryDelayMs } from '../jobs/retry'
import { logger } from '../logging'
import { assertNotRecoveryMode } from '../recovery/state'
import {
  ExternalNotAppliedError,
  ExternalTimeoutError,
  getExternalOperation,
  type ExternalCallContext,
  type ResolvedExternalOperation,
} from './definition'
import { operacoesExternas, type LinhaOperacaoExterna } from './schema'

/** Fila que continua operações: repete (`pendente`) ou reconcilia (`incerta`). Pausada em modo recuperação. */
export const EXTERNAL_OPS_QUEUE = defineQueue({
  name: 'external-ops.advance',
  dedupe: 'by-key',
  externalEffect: true,
})

export function externalOperationJobKey(operationId: string): string {
  return `extop:${operationId}`
}

/** Reconciliação periódica de operação incerta (PRD §7.6): 30 s, 2, 10, 30 min e depois de hora em hora. */
const ESPERAS_DE_RECONCILIACAO_MS = [30_000, 120_000, 600_000, 1_800_000, 3_600_000]
const MAX_RECONCILIACOES = 48
const ESPERA_EM_RECUPERACAO_MS = 30_000
const FOLGA_DE_ABANDONO_MS = 60_000

export type ExternalOperationOutcome<TResult extends JsonValue = JsonValue> =
  | { readonly status: 'confirmada'; readonly operationId: string; readonly result: TResult }
  | { readonly status: 'incerta' | 'pendente' | 'em_andamento'; readonly operationId: string }
  | { readonly status: 'falhou'; readonly operationId: string; readonly error: string | null }

export interface ExternalOperationRequest<TInput extends JsonValue> {
  /** Uma chave por intenção de negócio (ex.: `cancelar:<assinaturaId>`): repetir a chamada não duplica o efeito. */
  readonly idempotencyKey: string
  /** Recurso afetado, para diagnóstico (`assinatura:<id>`). */
  readonly target: string
  /** Guardada para o worker repetir/reconciliar. Nunca segredo nem dado de cartão. */
  readonly input: TInput
}

export interface ExternalOperationDeps {
  readonly db?: Db
  readonly queue?: Pick<JobQueue, 'enqueueInTx'>
  readonly random?: () => number
}

interface Ambiente {
  readonly db: Db
  readonly queue: Pick<JobQueue, 'enqueueInTx'>
  readonly random: () => number
  readonly ctx: RequestContext
}

function ambiente(ctx: RequestContext, deps: ExternalOperationDeps): Ambiente {
  return {
    db: deps.db ?? getDatabase(),
    queue: deps.queue ?? getJobQueue(),
    random: deps.random ?? Math.random,
    ctx,
  }
}

/**
 * PRD §7.5: persistir a intenção → commit → chamar o provedor → registrar o resultado. Recusa com
 * `SYSTEM.RECOVERY_MODE` em modo recuperação (D0078). Timeout depois de possível sucesso vira `incerta`: um job
 * de reconciliação pergunta ao provedor (`reconcile`) ANTES de qualquer repetição. A mesma `idempotencyKey` devolve
 * a mesma operação, sem segunda chamada quando já confirmada.
 */
export async function runExternalOperation<TInput extends JsonValue, TResult extends JsonValue>(
  ctx: RequestContext,
  definicao: ResolvedExternalOperation<TInput, TResult>,
  request: ExternalOperationRequest<TInput>,
  deps: ExternalOperationDeps = {},
): Promise<ExternalOperationOutcome<TResult>> {
  const env = ambiente(ctx, deps)
  await assertNotRecoveryMode(ctx, env.db)
  const operacao = await persistirIntencao(env, definicao.type, request)
  return advanceOperation(ctx, definicao, operacao.id, deps)
}

async function persistirIntencao<TInput extends JsonValue>(
  env: Ambiente,
  tipo: string,
  request: ExternalOperationRequest<TInput>,
): Promise<LinhaOperacaoExterna> {
  const { db, ctx } = env
  const agora = ctx.clock.now()
  return db.transaction(async (tx) => {
    await tx
      .insert(operacoesExternas)
      .values({
        id: newId(ctx.clock),
        barbeariaId: ctx.barbeariaId,
        tipo,
        chaveIdempotente: request.idempotencyKey,
        alvo: request.target,
        entrada: request.input,
        criadoEm: agora,
        atualizadoEm: agora,
      })
      .onConflictDoNothing()
    const [linha] = await tx
      .select()
      .from(operacoesExternas)
      .where(
        and(
          eq(operacoesExternas.barbeariaId, ctx.barbeariaId),
          eq(operacoesExternas.tipo, tipo),
          eq(operacoesExternas.chaveIdempotente, request.idempotencyKey),
        ),
      )
    if (!linha) throw new Error('Operação externa não encontrada após persistir a intenção.')
    if (
      linha.alvo !== request.target ||
      hashPayload(linha.entrada) !== hashPayload(request.input)
    ) {
      throw IdempotencyErrors.KEY_REUSED()
    }
    return linha
  })
}

type Plano =
  | { readonly kind: 'done'; readonly linha: LinhaOperacaoExterna }
  | { readonly kind: 'busy'; readonly linha: LinhaOperacaoExterna }
  | { readonly kind: 'reconcile'; readonly linha: LinhaOperacaoExterna }
  | { readonly kind: 'execute'; readonly linha: LinhaOperacaoExterna }

function resultadoDe<TResult extends JsonValue>(
  linha: LinhaOperacaoExterna,
): ExternalOperationOutcome<TResult> {
  switch (linha.estado) {
    case 'confirmada':
      return { status: 'confirmada', operationId: linha.id, result: linha.resultado as TResult }
    case 'falhou':
      return { status: 'falhou', operationId: linha.id, error: linha.ultimoErro }
    case 'incerta':
    case 'pendente':
    case 'em_andamento':
      return { status: linha.estado, operationId: linha.id }
    default:
      throw new Error(`Estado de operação externa desconhecido: ${linha.estado}`)
  }
}

async function atualizar(
  tx: Tx,
  id: string,
  agora: Date,
  valores: Partial<typeof operacoesExternas.$inferInsert>,
): Promise<LinhaOperacaoExterna> {
  const [linha] = await tx
    .update(operacoesExternas)
    .set({ ...valores, atualizadoEm: agora, revisao: sql`${operacoesExternas.revisao} + 1` })
    .where(eq(operacoesExternas.id, id))
    .returning()
  if (!linha) throw new Error(`Operação externa ${id} não encontrada.`)
  return linha
}

/** Decide o próximo passo e, no mesmo lock, marca `em_andamento` quando vai chamar o provedor. */
async function planejar(
  env: Ambiente,
  definicao: ResolvedExternalOperation,
  operationId: string,
): Promise<Plano> {
  const { db, ctx } = env
  const agora = ctx.clock.now()
  return db.transaction(async (tx) => {
    const [linha] = await tx
      .select()
      .from(operacoesExternas)
      .where(
        and(
          eq(operacoesExternas.id, operationId),
          eq(operacoesExternas.barbeariaId, ctx.barbeariaId),
        ),
      )
      .for('update')
    if (!linha) throw new Error(`Operação externa ${operationId} não encontrada.`)
    switch (linha.estado) {
      case 'confirmada':
      case 'falhou':
        return { kind: 'done', linha }
      case 'em_andamento': {
        const iniciada = linha.iniciadaEm?.getTime() ?? 0
        if (agora.getTime() - iniciada < definicao.timeoutMs + FOLGA_DE_ABANDONO_MS) {
          return { kind: 'busy', linha }
        }
        // O processo que chamou sumiu no meio: a chamada pode ter saído, então é incerta.
        return {
          kind: 'reconcile',
          linha: await atualizar(tx, linha.id, agora, { estado: 'incerta' }),
        }
      }
      case 'incerta':
        return { kind: 'reconcile', linha }
      default:
        return {
          kind: 'execute',
          linha: await atualizar(tx, linha.id, agora, {
            estado: 'em_andamento',
            tentativas: linha.tentativas + 1,
            iniciadaEm: agora,
          }),
        }
    }
  })
}

/**
 * Avança uma operação conforme o estado: `pendente` → chama; `incerta` → reconcilia antes de qualquer repetição.
 * Usada por `runExternalOperation` e pelo job `external-ops.advance`.
 */
export async function advanceOperation<TInput extends JsonValue, TResult extends JsonValue>(
  ctx: RequestContext,
  definicao: ResolvedExternalOperation<TInput, TResult>,
  operationId: string,
  deps: ExternalOperationDeps = {},
): Promise<ExternalOperationOutcome<TResult>> {
  const env = ambiente(ctx, deps)
  await assertNotRecoveryMode(ctx, env.db)
  const base = definicao as unknown as ResolvedExternalOperation
  const plano = await planejar(env, base, operationId)
  switch (plano.kind) {
    case 'done':
      return resultadoDe<TResult>(plano.linha)
    case 'busy':
      return { status: 'em_andamento', operationId }
    case 'execute':
      return chamar<TResult>(env, base, plano.linha)
    case 'reconcile':
      return reconciliar<TResult>(env, base, plano.linha)
  }
}

function contextoDaChamada(
  env: Ambiente,
  linha: LinhaOperacaoExterna,
  signal: AbortSignal,
): ExternalCallContext {
  return {
    ctx: env.ctx,
    operationId: linha.id,
    idempotencyKey: linha.chaveIdempotente,
    attempt: Math.max(linha.tentativas, 1),
    signal,
  }
}

async function comTimeout<T>(
  ms: number,
  executar: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controle = new AbortController()
  let timer: NodeJS.Timeout | undefined
  const expira = new Promise<never>((_, rejeitar) => {
    timer = setTimeout(() => {
      controle.abort()
      rejeitar(new ExternalTimeoutError(ms))
    }, ms)
  })
  try {
    return await Promise.race([executar(controle.signal), expira])
  } finally {
    clearTimeout(timer)
  }
}

interface Mudanca {
  readonly valores: Partial<typeof operacoesExternas.$inferInsert>
  /** Agenda `external-ops.advance` na mesma transação. */
  readonly seguirEm?: Date
  readonly pendencia?: DeadLetterEvent
}

/** Grava o resultado da chamada (e o job seguinte) numa transação; a pendência sai depois do commit. */
async function registrar<TResult extends JsonValue>(
  env: Ambiente,
  linha: LinhaOperacaoExterna,
  mudanca: Mudanca,
): Promise<ExternalOperationOutcome<TResult>> {
  const { db, ctx } = env
  const atualizada = await db.transaction(async (tx) => {
    const nova = await atualizar(tx, linha.id, ctx.clock.now(), mudanca.valores)
    if (mudanca.seguirEm) {
      await env.queue.enqueueInTx(tx, {
        queue: EXTERNAL_OPS_QUEUE.name,
        payload: { operationId: linha.id },
        singletonKey: externalOperationJobKey(linha.id),
        startAfter: mudanca.seguirEm,
        correlationId: ctx.correlationId,
      })
    }
    return nova
  })
  if (mudanca.pendencia) await reportDeadLetter(mudanca.pendencia)
  return resultadoDe<TResult>(atualizada)
}

function pendenciaDe(
  linha: LinhaOperacaoExterna,
  ctx: RequestContext,
  reason: DeadLetterEvent['reason'],
  error: string,
): DeadLetterEvent {
  return {
    source: 'external-op',
    reason,
    ref: linha.id,
    queue: linha.tipo,
    error,
    correlationId: ctx.correlationId,
  }
}

function emRecuperacao(error: unknown): boolean {
  return isAppError(error) && error.code === SystemErrors.codes.RECOVERY_MODE
}

async function chamar<TResult extends JsonValue>(
  env: Ambiente,
  definicao: ResolvedExternalOperation,
  linha: LinhaOperacaoExterna,
): Promise<ExternalOperationOutcome<TResult>> {
  const { ctx } = env
  const depois = (ms: number): Date => new Date(ctx.clock.now().getTime() + ms)
  try {
    const resultado = await comTimeout(definicao.timeoutMs, (signal) =>
      definicao.execute(linha.entrada as JsonValue, contextoDaChamada(env, linha, signal)),
    )
    return await registrar<TResult>(env, linha, {
      valores: { estado: 'confirmada', resultado, ultimoErro: null },
    })
  } catch (error) {
    const texto = describeError(error)
    if (emRecuperacao(error)) {
      // A chamada nem saiu: devolve a tentativa e espera o operador.
      return registrar<TResult>(env, linha, {
        valores: { estado: 'pendente', tentativas: Math.max(linha.tentativas - 1, 0) },
        seguirEm: depois(ESPERA_EM_RECUPERACAO_MS),
      })
    }
    if (classifyFailure(error).kind === 'permanent') {
      logger.error(
        { operationId: linha.id, tipo: linha.tipo, erro: texto },
        'operação externa falhou (permanente)',
      )
      return registrar<TResult>(env, linha, {
        valores: { estado: 'falhou', ultimoErro: texto },
        pendencia: pendenciaDe(linha, ctx, 'permanent', texto),
      })
    }
    if (error instanceof ExternalNotAppliedError) {
      const espera = nextRetryDelayMs(
        definicao.retry,
        linha.tentativas - 1,
        env.random,
        error.retryAfterMs,
      )
      if (espera === null) {
        return registrar<TResult>(env, linha, {
          valores: { estado: 'falhou', ultimoErro: texto },
          pendencia: pendenciaDe(linha, ctx, 'exhausted', texto),
        })
      }
      return registrar<TResult>(env, linha, {
        valores: { estado: 'pendente', ultimoErro: texto },
        seguirEm: depois(espera),
      })
    }
    // Timeout, rede, 5xx: o provedor pode ter aplicado. Nunca repetir às cegas.
    logger.warn(
      { operationId: linha.id, tipo: linha.tipo, erro: texto },
      'operação externa incerta',
    )
    if (!definicao.reconcile) {
      return registrar<TResult>(env, linha, {
        valores: { estado: 'incerta', ultimoErro: texto },
        pendencia: pendenciaDe(linha, ctx, 'exhausted', `incerta e sem reconcile: ${texto}`),
      })
    }
    return registrar<TResult>(env, linha, {
      valores: { estado: 'incerta', ultimoErro: texto },
      seguirEm: depois(ESPERAS_DE_RECONCILIACAO_MS[0] ?? 30_000),
    })
  }
}

async function reconciliar<TResult extends JsonValue>(
  env: Ambiente,
  definicao: ResolvedExternalOperation,
  linha: LinhaOperacaoExterna,
): Promise<ExternalOperationOutcome<TResult>> {
  const { ctx } = env
  if (!definicao.reconcile) return resultadoDe<TResult>(linha)
  const reconcile = definicao.reconcile
  let desfecho: Awaited<ReturnType<typeof reconcile>>
  try {
    desfecho = await comTimeout(definicao.timeoutMs, (signal) =>
      reconcile(linha.entrada as JsonValue, contextoDaChamada(env, linha, signal)),
    )
  } catch (error) {
    if (emRecuperacao(error)) throw error
    logger.warn(
      { operationId: linha.id, erro: describeError(error) },
      'reconciliação falhou; tentará de novo',
    )
    desfecho = { outcome: 'unknown' }
  }

  if (desfecho.outcome === 'applied') {
    return registrar<TResult>(env, linha, {
      valores: { estado: 'confirmada', resultado: desfecho.result, ultimoErro: null },
    })
  }
  if (desfecho.outcome === 'not_applied') {
    // O provedor confirmou que NÃO aplicou: só agora é seguro repetir (com a mesma chave de idempotência).
    const plano = await reabrir(env, linha)
    return plano ? chamar<TResult>(env, definicao, plano) : resultadoDe<TResult>(linha)
  }
  const tentativas = linha.reconciliacoes + 1
  if (tentativas >= MAX_RECONCILIACOES) {
    const texto = 'reconciliação sem resposta conclusiva do provedor'
    return registrar<TResult>(env, linha, {
      valores: { reconciliacoes: tentativas },
      pendencia: pendenciaDe(linha, ctx, 'exhausted', texto),
    })
  }
  const espera =
    ESPERAS_DE_RECONCILIACAO_MS[Math.min(tentativas, ESPERAS_DE_RECONCILIACAO_MS.length - 1)] ??
    3_600_000
  return registrar<TResult>(env, linha, {
    valores: { reconciliacoes: tentativas },
    seguirEm: new Date(ctx.clock.now().getTime() + espera),
  })
}

/** `incerta` → `em_andamento` com nova tentativa, se ninguém mudou o estado nesse meio-tempo. */
async function reabrir(
  env: Ambiente,
  linha: LinhaOperacaoExterna,
): Promise<LinhaOperacaoExterna | undefined> {
  const { db, ctx } = env
  const agora = ctx.clock.now()
  return db.transaction(async (tx) => {
    const [atual] = await tx
      .select()
      .from(operacoesExternas)
      .where(eq(operacoesExternas.id, linha.id))
      .for('update')
    if (!atual || atual.estado !== 'incerta') return undefined
    return atualizar(tx, atual.id, agora, {
      estado: 'em_andamento',
      tentativas: atual.tentativas + 1,
      iniciadaEm: agora,
    })
  })
}

/** O worker chama no boot: registra o job que continua operações pendentes/incertas. */
export function registerExternalOperationsJobs(): void {
  registerJobHandler<{ operationId: string }>(EXTERNAL_OPS_QUEUE, async ({ payload, ctx }) => {
    const db = getDatabase()
    const [linha] = await db
      .select({ tipo: operacoesExternas.tipo })
      .from(operacoesExternas)
      .where(
        and(
          eq(operacoesExternas.id, payload.operationId),
          eq(operacoesExternas.barbeariaId, ctx.barbeariaId),
        ),
      )
    if (!linha) throw new Error(`Operação externa ${payload.operationId} não encontrada.`)
    await advanceOperation(ctx, getExternalOperation(linha.tipo), payload.operationId)
  })
}
