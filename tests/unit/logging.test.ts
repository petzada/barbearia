import { Writable } from 'node:stream'
import { describe, expect, it } from 'vitest'
import {
  createLogger,
  maskPhone,
  maskPhonesInText,
  redactSensitive,
  REDACTED,
} from '~/platform/logging'

function capturarLogs(): {
  linhas: () => Record<string, unknown>[]
  logger: ReturnType<typeof createLogger>
} {
  const bruto: string[] = []
  const destino = new Writable({
    write(chunk: Buffer, _enc, cb) {
      bruto.push(chunk.toString('utf8'))
      cb()
    },
  })
  return {
    logger: createLogger({ level: 'debug', destination: destino }),
    linhas: () =>
      bruto
        .join('')
        .split('\n')
        .filter(Boolean)
        .map((linha) => JSON.parse(linha) as Record<string, unknown>),
  }
}

describe('redaction central (PRD §7.8)', () => {
  it('mascara telefone mantendo país e 4 últimos dígitos', () => {
    expect(maskPhone('+5511987654321')).toBe('+55*******4321')
    expect(maskPhone('11987654321')).toBe('*******4321')
    expect(maskPhone('123')).toBe(REDACTED)
  })

  it('mascara telefones dentro de texto livre', () => {
    expect(maskPhonesInText('Enviar para +55 (11) 98765-4321 agora')).not.toMatch(/98765|8765/)
    expect(maskPhonesInText('Reserva 1234 às 10:30')).toBe('Reserva 1234 às 10:30')
    // Ids de correlação/UUID não podem ser confundidos com telefone.
    const uuid = '01a13792-2088-74f1-b12e-7a1448c30e4d'
    expect(maskPhonesInText(`corr ${uuid} ok`)).toBe(`corr ${uuid} ok`)
    expect(maskPhonesInText('id 01234567-8901-7234-8901-234567890123')).toBe(
      'id 01234567-8901-7234-8901-234567890123',
    )
  })

  it('remove OTP, token, senha, cookie, cartão e assinatura por nome de chave, em qualquer profundidade', () => {
    const limpo = redactSensitive({
      otp: '123456',
      codigoVerificacao: '654321',
      sessionToken: 'abc',
      accessToken: 'abc',
      senha: 'x',
      password: 'x',
      authorization: 'Bearer x',
      cookie: 'sid=1',
      cardNumber: '4111111111111111',
      cartao: { numero: '4111', cvv: '123' },
      webhookSecret: 'segredo',
      code: 'SCHEDULING.SLOT_UNAVAILABLE',
      aninhado: { profundo: { token: 'zzz', nome: 'Corte' } },
      lista: [{ otp: '999' }],
    }) as Record<string, unknown>
    const texto = JSON.stringify(limpo)
    expect(texto).not.toMatch(/123456|654321|abc|4111|Bearer|sid=1|segredo|zzz|"999"|"x"/)
    expect(texto).toContain('Corte')
    expect(texto).toContain('SCHEDULING.SLOT_UNAVAILABLE') // código de erro não é segredo
  })

  it('mascara telefone por nome de chave e preserva o resto', () => {
    const limpo = redactSensitive({
      telefone: '+5511987654321',
      phone: '11987654321',
      servico: 'Corte',
    })
    expect(limpo).toEqual({ telefone: '+55*******4321', phone: '*******4321', servico: 'Corte' })
  })

  it('não quebra com estruturas circulares nem datas', () => {
    const circular: Record<string, unknown> = { quando: new Date('2027-01-31T15:00:00Z') }
    circular['eu'] = circular
    const limpo = redactSensitive(circular) as Record<string, unknown>
    expect(limpo['quando']).toBe('2027-01-31T15:00:00.000Z')
    expect(limpo['eu']).toBe('[circular]')
  })
})

describe('logger estruturado', () => {
  it('nunca escreve OTP, token ou telefone inteiro, nem em objeto nem em mensagem', () => {
    const { logger, linhas } = capturarLogs()
    logger.info(
      { otp: '123456', telefone: '+5511987654321', correlationId: 'corr-1' },
      'login de +5511987654321',
    )
    logger.warn({ headers: { authorization: 'Bearer abc.def', cookie: 'sid=zzz' } }, 'requisição')
    const texto = JSON.stringify(linhas())
    expect(texto).not.toMatch(/123456|987654321|Bearer|abc\.def|sid=zzz/)
    expect(texto).toContain('corr-1')
    expect(texto).toContain('+55*******4321')
  })

  it('erro vira {err} com stack mas sem telefone', () => {
    const { logger, linhas } = capturarLogs()
    logger.error(new Error('falhou para +5511987654321'), 'erro inesperado')
    const [linha] = linhas()
    const err = linha?.['err'] as { name: string; message: string; stack?: string }
    expect(err.name).toBe('Error')
    expect(err.message).not.toContain('987654321')
    expect(err.stack).toBeTruthy()
    expect(JSON.stringify(linha)).not.toContain('987654321')
  })

  it('child logger herda a redaction', () => {
    const { logger, linhas } = capturarLogs()
    logger.child({ correlationId: 'corr-2' }).info({ token: 'segredo-do-token' }, 'ok')
    expect(JSON.stringify(linhas())).not.toContain('segredo-do-token')
    expect(linhas()[0]?.['correlationId']).toBe('corr-2')
  })
})
