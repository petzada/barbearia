import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { EnvValidationError, parseEnv, zodIssuesToFields } from '~/platform/validation'
import {
  centavosSchema,
  dataLocalSchema,
  idempotencyKeySchema,
  pontosBaseSchema,
} from '~/platform/validation'

const AMBIENTE_MINIMO = {
  DATABASE_URL: 'postgresql://usuario:senha@host:5432/barbearia_dev',
  BARBEARIA_SLUG: 'moura',
}

describe('validação de ambiente (PRD §7.8)', () => {
  it('exige só o que o app usa hoje: banco e barbearia do deploy', () => {
    const env = parseEnv(AMBIENTE_MINIMO)
    expect(env.NODE_ENV).toBe('development')
    expect(env.PROCESS_ROLE).toBe('web')
    expect(env.LOG_LEVEL).toBe('info')
    expect(env.MERCADO_PAGO_ACCESS_TOKEN).toBeUndefined()
    expect(env.R2_BUCKET).toBeUndefined()
  })

  it('variáveis de integrações futuras ficam opcionais; vazias valem como ausentes', () => {
    const env = parseEnv({
      ...AMBIENTE_MINIMO,
      WOOVI_API_BASE_URL: '',
      WHATSAPP_OTP_API_KEY: '',
      R2_ENDPOINT: '',
      APP_URL: 'http://localhost:3000',
      MERCADO_PAGO_PUBLIC_KEY: 'TEST-chave',
    })
    expect(env.WOOVI_API_BASE_URL).toBeUndefined()
    expect(env.WHATSAPP_OTP_API_KEY).toBeUndefined()
    expect(env.APP_URL).toBe('http://localhost:3000')
    expect(env.MERCADO_PAGO_PUBLIC_KEY).toBe('TEST-chave')
  })

  it('falta de variável obrigatória falha com os NOMES e sem valores', () => {
    const erro = capturar(() => parseEnv({ BARBEARIA_SLUG: 'moura' }))
    expect(erro).toBeInstanceOf(EnvValidationError)
    expect(erro.message).toContain('DATABASE_URL')
    expect(erro.message).toContain('ausente')
    const outro = capturar(() => parseEnv({ DATABASE_URL: AMBIENTE_MINIMO.DATABASE_URL }))
    expect(outro.message).toContain('BARBEARIA_SLUG')
  })

  it('valor inválido nunca aparece na mensagem (senha da URL, segredo)', () => {
    const erro = capturar(() =>
      parseEnv({
        DATABASE_URL: 'mysql://usuario:SENHA-SECRETA-123@host/db',
        BARBEARIA_SLUG: 'Slug Inválido Com Espaços!',
        APP_URL: 'não-é-url-SEGREDO',
        BARBEARIA_FUSO: 'Marte/Olimpo',
      }),
    )
    expect(erro.message).toContain('DATABASE_URL')
    expect(erro.message).toContain('BARBEARIA_SLUG')
    expect(erro.message).toContain('APP_URL')
    expect(erro.message).toContain('BARBEARIA_FUSO')
    expect(erro.message).not.toMatch(/SENHA-SECRETA|SEGREDO|Marte|Slug Inválido/)
  })

  it('NODE_ENV e LOG_LEVEL só aceitam valores conhecidos', () => {
    expect(() => parseEnv({ ...AMBIENTE_MINIMO, NODE_ENV: 'staging' })).toThrow(EnvValidationError)
    expect(() => parseEnv({ ...AMBIENTE_MINIMO, LOG_LEVEL: 'tagarela' })).toThrow(
      EnvValidationError,
    )
  })
})

describe('mensagens de validação (pt-BR, sem eco do valor)', () => {
  const schema = z.object({
    nome: z.string().min(3),
    codigo: z.string().regex(/^\d{6}$/),
    itens: z.array(z.object({ id: z.uuid() })).min(1),
    papel: z.enum(['cliente', 'barbeiro']),
    explicito: z.string().min(5, 'Mensagem do módulo.'),
  })

  it('devolve caminho pontuado e texto seguro', () => {
    const resultado = schema.safeParse({
      nome: 'ab',
      codigo: '123456-OTP-REAL',
      itens: [{ id: 'x' }],
      papel: 'dono-do-mundo',
      explicito: 'abc',
    })
    expect(resultado.success).toBe(false)
    if (resultado.success) return
    const campos = zodIssuesToFields(resultado.error)
    expect(campos).toContainEqual({ path: 'nome', message: 'Informe ao menos 3 caractere(s).' })
    expect(campos).toContainEqual({ path: 'codigo', message: 'Formato inválido.' })
    expect(campos).toContainEqual({ path: 'itens.0.id', message: 'Formato inválido.' })
    expect(campos).toContainEqual({ path: 'papel', message: 'Valor não permitido.' })
    expect(campos).toContainEqual({ path: 'explicito', message: 'Mensagem do módulo.' })
    expect(JSON.stringify(campos)).not.toMatch(/OTP-REAL|dono-do-mundo/)
  })

  it('campo ausente é "obrigatório"', () => {
    const resultado = schema.safeParse({})
    if (resultado.success) throw new Error('deveria falhar')
    expect(zodIssuesToFields(resultado.error)).toContainEqual({
      path: 'nome',
      message: 'Campo obrigatório.',
    })
  })
})

describe('schemas de fronteira', () => {
  it('centavos rejeitam float e negativo; pontos-base vão de 0 a 10000', () => {
    expect(centavosSchema.safeParse(12990).success).toBe(true)
    expect(centavosSchema.safeParse(129.9).success).toBe(false)
    expect(centavosSchema.safeParse(-1).success).toBe(false)
    expect(pontosBaseSchema.safeParse(10_000).success).toBe(true)
    expect(pontosBaseSchema.safeParse(10_001).success).toBe(false)
  })

  it('chave de idempotência tem tamanho e alfabeto restritos', () => {
    expect(idempotencyKeySchema.safeParse(crypto.randomUUID()).success).toBe(true)
    expect(idempotencyKeySchema.safeParse('curta').success).toBe(false)
    expect(idempotencyKeySchema.safeParse('tem espaço e <script>').success).toBe(false)
    expect(idempotencyKeySchema.safeParse('x'.repeat(129)).success).toBe(false)
  })

  it('data local valida existência', () => {
    expect(dataLocalSchema.safeParse('2028-02-29').success).toBe(true)
    expect(dataLocalSchema.safeParse('2027-02-29').success).toBe(false)
    expect(dataLocalSchema.safeParse('29/02/2028').success).toBe(false)
  })
})

function capturar(fn: () => unknown): Error {
  try {
    fn()
  } catch (erro) {
    if (erro instanceof Error) return erro
  }
  throw new Error('esperava uma exceção')
}
