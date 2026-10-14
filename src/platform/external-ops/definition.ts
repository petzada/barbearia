import type { RequestContext } from '~/contracts/context'
import type { JsonValue } from '~/contracts/json'
import { RetryableJobError } from '../jobs/failures'
import { defineRetryPolicy, type RetryPolicy } from '../jobs/retry'

/** O provedor RECUSOU ou nunca recebeu a chamada (429, conexão recusada, 4xx transitório): é seguro repetir. */
export class ExternalNotAppliedError extends RetryableJobError {
  constructor(message: string, options?: { cause?: unknown; retryAfterMs?: number }) {
    super(message, options)
    this.name = 'ExternalNotAppliedError'
  }
}

/** A chamada passou de `timeoutMs`: o provedor pode ter aplicado. Vira `incerta`. */
export class ExternalTimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`Sem resposta do provedor em ${timeoutMs} ms.`)
    this.name = 'ExternalTimeoutError'
  }
}

export interface ExternalCallContext {
  readonly ctx: RequestContext
  readonly operationId: string
  /** Mande ao provedor como chave de idempotência da chamada, quando ele suportar. */
  readonly idempotencyKey: string
  /** 1 = primeira chamada. */
  readonly attempt: number
  /** Disparado no timeout: passe para o `fetch`. */
  readonly signal: AbortSignal
}

/** Resposta de `reconcile`: o que o provedor diz sobre a chamada que ficou incerta. */
export type ReconcileOutcome<TResult> =
  | { readonly outcome: 'applied'; readonly result: TResult }
  | { readonly outcome: 'not_applied' }
  | { readonly outcome: 'unknown' }

export interface ExternalOperationDefinition<TInput extends JsonValue, TResult extends JsonValue> {
  /** `provedor.acao` (ex.: `mercado-pago.cancelar-assinatura`). */
  readonly type: string
  /** Padrão: 15 000 ms. */
  readonly timeoutMs?: number
  /** Retentativas de falha DEFINITIVA (não aplicada). Padrão: imediato, 1, 5, 15, 60 min. */
  readonly retry?: Partial<RetryPolicy>
  /**
   * Executa a chamada. Lançar `ExternalNotAppliedError` = não aplicada (repete); `PermanentJobError` = falhou;
   * qualquer outra exceção (timeout, rede, 5xx) = `incerta`.
   */
  execute(input: TInput, call: ExternalCallContext): Promise<TResult>
  /**
   * Consulta o provedor para saber se uma chamada incerta foi aplicada (busca por `external_reference`, GET do
   * recurso). Sem `reconcile`, uma operação `incerta` NUNCA é repetida sozinha: exige ação humana (pendência).
   */
  reconcile?(input: TInput, call: ExternalCallContext): Promise<ReconcileOutcome<TResult>>
}

export interface ResolvedExternalOperation<
  TInput extends JsonValue = JsonValue,
  TResult extends JsonValue = JsonValue,
> {
  readonly type: string
  readonly timeoutMs: number
  readonly retry: RetryPolicy
  readonly execute: ExternalOperationDefinition<TInput, TResult>['execute']
  readonly reconcile: ExternalOperationDefinition<TInput, TResult>['reconcile']
}

const NOME_VALIDO = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/
const definicoes = new Map<string, ResolvedExternalOperation>()

/** Registra o tipo de operação; o worker usa o registro para reconciliar/repetir depois de um timeout. */
export function defineExternalOperation<TInput extends JsonValue, TResult extends JsonValue>(
  definicao: ExternalOperationDefinition<TInput, TResult>,
): ResolvedExternalOperation<TInput, TResult> {
  if (!NOME_VALIDO.test(definicao.type)) {
    throw new Error(
      `Tipo de operação externa inválido: "${definicao.type}" (ex.: "woovi.cobranca").`,
    )
  }
  if (definicoes.has(definicao.type)) {
    throw new Error(`O tipo de operação externa "${definicao.type}" já foi definido.`)
  }
  const resolvida: ResolvedExternalOperation<TInput, TResult> = {
    type: definicao.type,
    timeoutMs: definicao.timeoutMs ?? 15_000,
    retry: defineRetryPolicy(definicao.retry),
    execute: definicao.execute,
    reconcile: definicao.reconcile,
  }
  definicoes.set(definicao.type, resolvida as unknown as ResolvedExternalOperation)
  return resolvida
}

export function getExternalOperation(type: string): ResolvedExternalOperation {
  const definicao = definicoes.get(type)
  if (!definicao) throw new Error(`Tipo de operação externa "${type}" não foi definido.`)
  return definicao
}

/** Só para testes. */
export function resetExternalOperations(): void {
  definicoes.clear()
}
