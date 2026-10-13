import type { ErrorCode, FieldError } from '~/contracts/result'
import { AppError, type ErrorHttpStatus } from './app-error'

export interface ErrorSpec {
  readonly httpStatus: ErrorHttpStatus
  /** Texto seguro e útil para a pessoa (pt-BR). */
  readonly message: string
  readonly retryable?: boolean
}

export interface ErrorOverrides {
  /** Substitui a mensagem padrão (continua precisando ser segura). */
  readonly message?: string
  readonly fields?: readonly FieldError[]
  readonly retryAfterSeconds?: number
  readonly cause?: unknown
}

type Factories<P extends string, S extends Record<string, ErrorSpec>> = {
  readonly [K in keyof S & string]: (overrides?: ErrorOverrides) => AppError
} & {
  readonly codes: { readonly [K in keyof S & string]: `${P}.${K}` }
}

const PADRAO_PREFIXO = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/
const PADRAO_NOME = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/

/**
 * Formato oficial para um módulo declarar seus códigos de erro (PRD §7.3), em `modules/<m>/errors.ts`:
 *
 * ```ts
 * export const SchedulingErrors = defineErrors('SCHEDULING', {
 *   SLOT_UNAVAILABLE: { httpStatus: 409, message: 'Este horário não está mais disponível.' },
 * })
 * throw SchedulingErrors.SLOT_UNAVAILABLE()
 * SchedulingErrors.codes.SLOT_UNAVAILABLE // 'SCHEDULING.SLOT_UNAVAILABLE'
 * ```
 */
export function defineErrors<const P extends string, const S extends Record<string, ErrorSpec>>(
  prefix: P,
  specs: S,
): Factories<P, S> {
  if (!PADRAO_PREFIXO.test(prefix)) {
    throw new Error(`Prefixo de erro inválido: "${prefix}" (use MAIUSCULAS_COM_UNDERSCORE).`)
  }
  const factories: Record<string, unknown> = {}
  const codes: Record<string, string> = {}
  for (const [nome, spec] of Object.entries(specs)) {
    if (!PADRAO_NOME.test(nome)) {
      throw new Error(`Nome de erro inválido: "${nome}" (use MAIUSCULAS_COM_UNDERSCORE).`)
    }
    const code = `${prefix}.${nome}` as ErrorCode
    codes[nome] = code
    factories[nome] = (overrides?: ErrorOverrides): AppError =>
      new AppError({
        code,
        message: overrides?.message ?? spec.message,
        httpStatus: spec.httpStatus,
        retryable: spec.retryable ?? false,
        ...(overrides?.fields ? { fields: overrides.fields } : {}),
        ...(overrides?.retryAfterSeconds === undefined
          ? {}
          : { retryAfterSeconds: overrides.retryAfterSeconds }),
        ...(overrides?.cause === undefined ? {} : { cause: overrides.cause }),
      })
  }
  factories['codes'] = Object.freeze(codes)
  return factories as Factories<P, S>
}
