import pino from 'pino'

// PRD §7.8: logs estruturados com redaction; nunca OTP, token, cartão ou payload pessoal completo.
export const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  redact: {
    paths: ['*.password', '*.token', '*.otp', '*.authorization', '*.cookie', '*.cardNumber'],
    censor: '[redigido]',
  },
})
