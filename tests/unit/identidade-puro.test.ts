import { describe, expect, it } from 'vitest'
import { isAllowedOrigin } from '../../src/platform/auth/origin'
import { generateOtpCode, hashOtpCode, safeEqualHex } from '../../src/platform/auth/otp-crypto'
import { normalizeBrazilianPhone } from '../../src/platform/auth/phone'
import { challengeStatus, decideSend, DEFAULT_OTP_POLICY } from '../../src/modules/identity/domain/otp'
import { papeisEfetivos, podeReceberPapel, podeRemoverAdmin } from '../../src/modules/identity/domain/papeis'

describe('telefone brasileiro → E.164 (RN01)', () => {
  it.each([
    ['(11) 98765-4321', '+5511987654321'],
    ['11987654321', '+5511987654321'],
    ['5511987654321', '+5511987654321'],
    ['+55 11 98765-4321', '+5511987654321'],
    ['  +5521999990000 ', '+5521999990000'],
  ])('normaliza %s', (entrada, esperado) => {
    expect(normalizeBrazilianPhone(entrada)).toBe(esperado)
  })

  it.each(['', 'abc', '987654321', '1198765432', '+1 415 555 0100', '(01) 98765-4321', '1187654321', '+5511387654321', '551198765432'])(
    'recusa %s',
    (entrada) => {
      expect(normalizeBrazilianPhone(entrada)).toBeNull()
    },
  )
})

describe('regras puras do OTP', () => {
  const agora = new Date('2027-01-31T15:00:00Z')
  const base = { expiraEm: new Date(agora.getTime() + 300_000), tentativas: 0, maxTentativas: 5, invalidadoEm: null, verificadoEm: null }

  it('validade semiaberta: em expiraEm já expirou', () => {
    expect(challengeStatus(base, agora)).toBe('valido')
    expect(challengeStatus(base, new Date(base.expiraEm.getTime() - 1))).toBe('valido')
    expect(challengeStatus(base, base.expiraEm)).toBe('expirado')
  })

  it('esgotado, invalidado e consumido', () => {
    expect(challengeStatus({ ...base, tentativas: 5 }, agora)).toBe('esgotado')
    expect(challengeStatus({ ...base, invalidadoEm: agora }, agora)).toBe('invalidado')
    expect(challengeStatus({ ...base, verificadoEm: agora }, agora)).toBe('consumido')
  })

  it('limite de envios: janela deslizante e tempo de espera', () => {
    const regra = DEFAULT_OTP_POLICY.phoneSends // 3 / 15 min
    const t = (min: number) => new Date(agora.getTime() - min * 60_000)
    expect(decideSend([t(1), t(2)], agora, regra)).toEqual({ allowed: true })
    expect(decideSend([t(1), t(2), t(3)], agora, regra)).toEqual({ allowed: false, retryAfterSeconds: 12 * 60 })
    expect(decideSend([t(16), t(2), t(3)], agora, regra)).toEqual({ allowed: true }) // o de 16 min saiu da janela
  })

  it('hash do código: depende do desafio e do segredo; comparação em tempo constante', () => {
    const codigo = generateOtpCode()
    expect(codigo).toMatch(/^\d{6}$/)
    const h1 = hashOtpCode({ code: codigo, challengeId: 'a', secret: 's' })
    expect(h1).toMatch(/^[0-9a-f]{64}$/)
    expect(hashOtpCode({ code: codigo, challengeId: 'b', secret: 's' })).not.toBe(h1)
    expect(hashOtpCode({ code: codigo, challengeId: 'a', secret: 't' })).not.toBe(h1)
    expect(safeEqualHex(h1, h1)).toBe(true)
    expect(safeEqualHex(h1, h1.replace(/.$/, '0') === h1 ? h1.replace(/.$/, '1') : h1.replace(/.$/, '0'))).toBe(false)
    expect(safeEqualHex('', '')).toBe(false)
  })
})

describe('papéis (D0002/D0071)', () => {
  it('cliente é implícito em conta viva; pré-cadastro e anonimizada não têm papel algum', () => {
    expect(papeisEfetivos('ativo', [])).toEqual(['cliente'])
    expect(papeisEfetivos('ativo', ['barbeiro', 'admin'])).toEqual(['cliente', 'barbeiro', 'admin'])
    expect(papeisEfetivos('exclusao_agendada', [])).toEqual(['cliente'])
    expect(papeisEfetivos('pre_cadastrado', ['admin'])).toEqual([])
    expect(papeisEfetivos('anonimizado', ['admin'])).toEqual([])
  })

  it('só conta ativa recebe papel; nunca fica sem admin', () => {
    expect(podeReceberPapel('ativo')).toBe(true)
    expect(podeReceberPapel('pre_cadastrado')).toBe(false)
    expect(podeRemoverAdmin(0)).toBe(false)
    expect(podeRemoverAdmin(1)).toBe(true)
  })
})

describe('verificação de Origin (CSRF)', () => {
  const post = (cabecalhos: Record<string, string>, url = 'http://localhost:3000/x') =>
    new Request(url, { method: 'POST', headers: cabecalhos })

  it('GET nunca é bloqueado; POST exige origem igual ou Sec-Fetch-Site same-origin', () => {
    expect(isAllowedOrigin(new Request('http://localhost:3000/x'))).toBe(true)
    expect(isAllowedOrigin(post({ origin: 'http://localhost:3000' }))).toBe(true)
    expect(isAllowedOrigin(post({ origin: 'http://localhost:3000.evil.example' }))).toBe(false)
    expect(isAllowedOrigin(post({ origin: 'null' }))).toBe(false)
    expect(isAllowedOrigin(post({}))).toBe(false)
    expect(isAllowedOrigin(post({ 'sec-fetch-site': 'same-origin' }))).toBe(true)
    expect(isAllowedOrigin(post({ 'sec-fetch-site': 'same-site' }))).toBe(false)
  })

  it('APP_URL é uma origem adicional aceita', () => {
    const req = post({ origin: 'https://app.exemplo.com' })
    expect(isAllowedOrigin(req)).toBe(false)
    expect(isAllowedOrigin(req, { appUrl: 'https://app.exemplo.com/' })).toBe(true)
  })

})
