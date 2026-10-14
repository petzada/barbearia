import { isAppError } from '../errors/app-error'
import { redactSensitive } from '../logging'

/** Erro permanente (configuração, 4xx do provedor): não entra em loop, vai direto para pendência. */
export class PermanentJobError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'PermanentJobError'
  }
}

/** Erro transitório explícito (timeout, 429, 5xx). `retryAfterMs` respeita o `Retry-After` do provedor. */
export class RetryableJobError extends Error {
  readonly retryAfterMs: number | undefined

  constructor(message: string, options?: { cause?: unknown; retryAfterMs?: number }) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'RetryableJobError'
    this.retryAfterMs = options?.retryAfterMs
  }
}

export type FailureKind = 'permanent' | 'transient'

export interface FailureClassification {
  readonly kind: FailureKind
  readonly retryAfterMs?: number
}

/**
 * PRD §7.6: retentar só falhas transitórias. `PermanentJobError` e `AppError` não retentável são
 * permanentes; qualquer outra exceção é tratada como transitória (o limite de tentativas a contém).
 */
export function classifyFailure(error: unknown): FailureClassification {
  if (error instanceof PermanentJobError) return { kind: 'permanent' }
  if (error instanceof RetryableJobError) {
    return error.retryAfterMs === undefined
      ? { kind: 'transient' }
      : { kind: 'transient', retryAfterMs: error.retryAfterMs }
  }
  if (isAppError(error)) {
    return error.retryable
      ? {
          kind: 'transient',
          ...(error.retryAfterSeconds === undefined
            ? {}
            : { retryAfterMs: error.retryAfterSeconds * 1000 }),
        }
      : { kind: 'permanent' }
  }
  return { kind: 'transient' }
}

/** 408, 425, 429 e 5xx são transitórios; os demais 4xx são erro de configuração ou de dados (permanentes). */
export function classifyHttpStatus(status: number): FailureKind {
  if (status === 408 || status === 425 || status === 429 || status >= 500) return 'transient'
  return 'permanent'
}

/** `Retry-After` em segundos ou data HTTP → milissegundos (nunca negativo). */
export function parseRetryAfter(valor: string | null | undefined, agora: Date): number | undefined {
  if (!valor) return undefined
  const segundos = Number(valor)
  if (Number.isFinite(segundos)) return Math.max(0, Math.round(segundos * 1000))
  const data = Date.parse(valor)
  return Number.isNaN(data) ? undefined : Math.max(0, data - agora.getTime())
}

const LIMITE_ERRO = 500

/** Texto de erro seguro para coluna e log: sem segredo/telefone (redaction central), no máximo 500 caracteres. */
export function describeError(error: unknown): string {
  const bruto = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  const seguro = String(redactSensitive(bruto))
  return seguro.length > LIMITE_ERRO ? `${seguro.slice(0, LIMITE_ERRO)}…` : seguro
}
