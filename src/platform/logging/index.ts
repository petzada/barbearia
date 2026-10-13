import pino, { type DestinationStream, type Logger } from 'pino'
import { redactSensitive } from './redact'

export { maskPhone, maskPhonesInText, REDACTED, redactSensitive } from './redact'
export type { Logger } from 'pino'

export interface LoggerOptions {
  readonly level?: string
  /** Destino alternativo (testes capturam a saída aqui). */
  readonly destination?: DestinationStream
}

// PRD §7.8: logs estruturados com redaction; nunca OTP, token, cartão ou payload pessoal completo.
// O hook passa TODO argumento de log (objeto ou texto) por `redactSensitive` antes de serializar.
export function createLogger(options: LoggerOptions = {}): Logger {
  const config: pino.LoggerOptions = {
    level: options.level ?? process.env['LOG_LEVEL'] ?? 'info',
    hooks: {
      logMethod(args, method) {
        const seguros = args.map((arg) =>
          arg instanceof Error ? { err: redactSensitive(arg) } : redactSensitive(arg),
        ) as Parameters<typeof method>
        return method.apply(this, seguros)
      },
    },
  }
  return options.destination ? pino(config, options.destination) : pino(config)
}

export const logger = createLogger()
