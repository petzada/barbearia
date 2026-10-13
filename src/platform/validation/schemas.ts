import { z } from 'zod'
import { parseLocalDate, parseLocalTime, type LocalDate, type LocalTime } from '../time'

// Schemas Zod reutilizáveis nas fronteiras (entrada de server function, webhooks, config).

export const uuidSchema = z.uuid()

/** Dinheiro em centavos inteiros e não negativos; float é rejeitado na fronteira (PRD §6.1). */
export const centavosSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)

/** Pontos-base: 10000 = 100%. */
export const pontosBaseSchema = z.number().int().min(0).max(10_000)

export const revisaoSchema = z.number().int().min(0)

/** Chave de idempotência escolhida pelo cliente: uma por intenção do usuário (UUID serve). */
export const idempotencyKeySchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9_\-:.]+$/, 'Chave de idempotência inválida.')

export const diaAncoraSchema = z.number().int().min(1).max(31)

export const dataLocalSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (AAAA-MM-DD).')
  .transform((valor, ctx): LocalDate => {
    try {
      return parseLocalDate(valor)
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Data inexistente.' })
      return z.NEVER
    }
  })

export const horaLocalSchema = z.string().transform((valor, ctx): LocalTime => {
  try {
    return parseLocalTime(valor)
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Hora inválida (HH:mm).' })
    return z.NEVER
  }
})
