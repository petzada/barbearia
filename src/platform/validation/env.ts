import { z } from 'zod'
import { isValidTimeZone } from '../time'
import { configurarMensagensDeValidacao } from './messages'

// Validação do ambiente no boot (PRD §7.8). Exige só o que o app usa hoje: banco e identidade do deploy.
// As variáveis de integração do .env.example (T04, T08–T12, T30) são opcionais até a task delas
// ativar a exigência. Nunca coloque o VALOR de uma variável em mensagem de erro, log ou relatório.

/** `''` (variável declarada e vazia no .env) vale como ausente. */
const textoOpcional = z.preprocess(
  (valor) => (valor === '' ? undefined : valor),
  z.string().min(1).optional(),
)

const urlOpcional = z.preprocess((valor) => (valor === '' ? undefined : valor), z.url().optional())

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PROCESS_ROLE: z.enum(['web', 'worker']).default('web'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  // Usadas hoje.
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((url) => /^postgres(ql)?:\/\//.test(url), 'Deve ser uma URL postgresql://.'),
  BARBEARIA_SLUG: z
    .string()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      'Use minúsculas, números e hífens (ex.: barbearia-do-moura).',
    ),

  // Apoio ao seed e aos testes.
  BARBEARIA_NOME: textoOpcional,
  BARBEARIA_FUSO: z.preprocess(
    (valor) => (valor === '' ? undefined : valor),
    z.string().refine(isValidTimeZone, 'Fuso IANA inválido (ex.: America/Sao_Paulo).').optional(),
  ),
  DATABASE_URL_TEST: textoOpcional,

  // Futuras (opcionais até a task dona exigir): aplicação e login (T04).
  APP_URL: urlOpcional,
  BETTER_AUTH_SECRET: textoOpcional,
  GOOGLE_CLIENT_ID: textoOpcional,
  GOOGLE_CLIENT_SECRET: textoOpcional,

  // Mercado Pago (T10).
  MERCADO_PAGO_PUBLIC_KEY: textoOpcional,
  MERCADO_PAGO_ACCESS_TOKEN: textoOpcional,
  MERCADO_PAGO_WEBHOOK_SECRET: textoOpcional,
  MERCADO_PAGO_USER_ID: textoOpcional,

  // Woovi (T11).
  WOOVI_API_BASE_URL: urlOpcional,
  WOOVI_APP_ID: textoOpcional,
  WOOVI_SUBACCOUNT_ID: textoOpcional,
  WOOVI_WEBHOOK_SECRET: textoOpcional,

  // WhatsMiau (T09).
  WHATSAPP_OTP_API_KEY: textoOpcional,
  WHATSAPP_OTP_INSTANCE: textoOpcional,
  WHATSAPP_AVISOS_API_KEY: textoOpcional,
  WHATSAPP_AVISOS_INSTANCE: textoOpcional,
  WHATSAPP_WEBHOOK_TOKEN: textoOpcional,

  // Cloudflare R2 (T08).
  R2_ACCOUNT_ID: textoOpcional,
  R2_ACCESS_KEY_ID: textoOpcional,
  R2_SECRET_ACCESS_KEY: textoOpcional,
  R2_BUCKET: textoOpcional,
  R2_ENDPOINT: urlOpcional,

  // Web Push (T30).
  VAPID_PUBLIC_KEY: textoOpcional,
  VAPID_PRIVATE_KEY: textoOpcional,
  VAPID_SUBJECT: textoOpcional,
})

export type Env = z.infer<typeof envSchema>

/** Lista os NOMES das variáveis com problema e o motivo; nunca os valores. */
export class EnvValidationError extends Error {
  readonly problems: readonly { variable: string; reason: string }[]

  constructor(problems: readonly { variable: string; reason: string }[]) {
    const linhas = problems.map((p) => `  - ${p.variable}: ${p.reason}`).join('\n')
    super(
      `Configuração de ambiente inválida. Confira o .env.local (veja o .env.example):\n${linhas}`,
    )
    this.name = 'EnvValidationError'
    this.problems = problems
  }
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  configurarMensagensDeValidacao()
  const resultado = envSchema.safeParse(source)
  if (resultado.success) return resultado.data
  throw new EnvValidationError(
    resultado.error.issues.map((issue) => ({
      variable: issue.path.map(String).join('.') || '(raiz)',
      reason:
        issue.code === 'invalid_type' && issue.input === undefined ? 'ausente' : issue.message,
    })),
  )
}

let memoizado: Env | undefined

/** Valida `process.env` uma vez e devolve o resultado tipado. Chamar no começo de web e worker. */
export function loadEnv(): Env {
  memoizado ??= parseEnv(process.env)
  return memoizado
}

/** Só para testes: esquece a validação memoizada. */
export function resetEnvCache(): void {
  memoizado = undefined
}
