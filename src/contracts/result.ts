/** Código de erro namespaced: `MODULO.CODIGO` (ex.: `SCHEDULING.SLOT_UNAVAILABLE`). PRD §7.3. */
export type ErrorCode = `${Uppercase<string>}.${Uppercase<string>}`

export interface FieldError {
  /** Caminho do campo com pontos (`itens.0.servicoId`). */
  readonly path: string
  readonly message: string
}

export interface OkResult<T> {
  readonly status: 'ok'
  readonly data: T
  /** Revisão do recurso depois da operação (para o próximo `expectedRevision`); `null` se não se aplica. */
  readonly revision: number | null
}

/** Efeito externo em andamento (D0055): o cliente acompanha pelo protocolo. */
export interface PendingResult {
  readonly status: 'pending'
  readonly operationId: string
  readonly protocol: string | null
  /** ISO 8601: quando vale a pena consultar de novo. */
  readonly nextUpdateAt: string | null
}

export interface ErrorResult {
  readonly status: 'error'
  readonly code: ErrorCode
  /** Mensagem segura para exibir; nunca contém stack, SQL ou dado pessoal. */
  readonly message: string
  readonly fields: readonly FieldError[]
  readonly retryable: boolean
  readonly correlationId: string
  /** Mapeamento HTTP do PRD §7.3 (401, 403, 409, 422, 429, 503; 404 e 500 em casos genéricos). */
  readonly httpStatus: number
  readonly retryAfterSeconds?: number
}

export type Result<T> = OkResult<T> | PendingResult | ErrorResult

export function ok<T>(data: T, revision: number | null = null): OkResult<T> {
  return { status: 'ok', data, revision }
}

export function pending(input: {
  operationId: string
  protocol?: string | null
  nextUpdateAt?: Date | null
}): PendingResult {
  return {
    status: 'pending',
    operationId: input.operationId,
    protocol: input.protocol ?? null,
    nextUpdateAt: input.nextUpdateAt?.toISOString() ?? null,
  }
}
