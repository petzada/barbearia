import type { ErrorResult, Result } from '~/contracts/result'
import { isAppError, type AppError } from './app-error'
import { SystemErrors } from './generic'

/** Mapeamento HTTP para rotas (webhooks, `api/`): ok 200, pendente 202, erro pelo próprio `httpStatus`. */
export function httpStatusOf(result: Result<unknown>): number {
  if (result.status === 'ok') return 200
  if (result.status === 'pending') return 202
  return result.httpStatus
}

export function appErrorToResult(error: AppError, correlationId: string): ErrorResult {
  return {
    status: 'error',
    code: error.code,
    message: error.message,
    fields: error.fields,
    retryable: error.retryable,
    correlationId,
    httpStatus: error.httpStatus,
    ...(error.retryAfterSeconds === undefined
      ? {}
      : { retryAfterSeconds: error.retryAfterSeconds }),
  }
}

/**
 * Converte qualquer erro em `ErrorResult` seguro. `AppError` passa com o seu texto; todo o resto
 * (SQL, stack, bug) vira `SYSTEM.INTERNAL` com mensagem genérica. O chamador registra o erro original
 * no log com o mesmo `correlationId`.
 */
export function errorToResult(error: unknown, correlationId: string): ErrorResult {
  if (isAppError(error)) return appErrorToResult(error, correlationId)
  return appErrorToResult(SystemErrors.INTERNAL(), correlationId)
}
