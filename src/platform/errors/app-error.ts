import type { ErrorCode, FieldError } from '~/contracts/result'

/** Status HTTP usados pelo PRD §7.3 (+ 404 e 500 para casos genéricos). */
export type ErrorHttpStatus = 401 | 403 | 404 | 409 | 422 | 429 | 500 | 503

export interface AppErrorInit {
  readonly code: ErrorCode
  /** Mensagem segura para o usuário final: sem stack, SQL, segredo ou dado pessoal. */
  readonly message: string
  readonly httpStatus: ErrorHttpStatus
  readonly fields?: readonly FieldError[]
  readonly retryable?: boolean
  readonly retryAfterSeconds?: number
  /** Causa interna (vai para o log, nunca para o cliente). */
  readonly cause?: unknown
}

/**
 * Erro esperado de negócio ou de plataforma. Só `AppError` chega ao cliente com o seu texto;
 * qualquer outro erro vira `SYSTEM.INTERNAL` (ver `errorToResult`).
 */
export class AppError extends Error {
  readonly code: ErrorCode
  readonly httpStatus: ErrorHttpStatus
  readonly fields: readonly FieldError[]
  readonly retryable: boolean
  readonly retryAfterSeconds: number | undefined

  constructor(init: AppErrorInit) {
    super(init.message, init.cause === undefined ? undefined : { cause: init.cause })
    this.name = 'AppError'
    this.code = init.code
    this.httpStatus = init.httpStatus
    this.fields = init.fields ?? []
    this.retryable = init.retryable ?? false
    this.retryAfterSeconds = init.retryAfterSeconds
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError
}
