import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { requestOtp, verifyOtp } from '../../src/modules/identity/application/otp-service'
import { otpDesafios } from '../../src/modules/identity/schema'
import { abrirBancoDeTeste, type BancoDeTeste } from './helpers/banco'
import { criarAmbiente, type Ambiente } from './helpers/identidade'

describe('OTP (RN01)', () => {
  let banco: BancoDeTeste
  let amb: Ambiente
  let n = 0

  beforeAll(async () => {
    banco = await abrirBancoDeTeste()
    amb = await criarAmbiente(banco)
  })

  afterAll(async () => {
    await banco.encerrar()
  })

  /** Telefone novo por teste (o limite por telefone vale para cada número). */
  const telefone = () => `+55119777${String(++n).padStart(5, '0')}`
  const pedir = (phone: string, ip = `192.0.2.${++n}`) =>
    requestOtp(amb.deps, { barbeariaId: banco.barbearia.id, phone, finalidade: 'login', ip })
  const verificar = (phone: string, code: string) =>
    verifyOtp(amb.deps, { barbeariaId: banco.barbearia.id, phone, code, finalidade: 'login' })
  const errado = (certo: string) => (certo === '000000' ? '111111' : '000000')

  it('o código é guardado só como hash e nunca aparece em texto no banco', async () => {
    const phone = telefone()
    const { desafioId } = await pedir(phone)
    const codigo = amb.ultimoCodigo()
    const [linha] = await banco.db.select().from(otpDesafios).where(eq(otpDesafios.id, desafioId))
    expect(linha?.codigoHash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(linha)).not.toContain(codigo)
    expect(linha?.ipHash).toMatch(/^[0-9a-f]{64}$/) // o IP bruto também não é gravado
  })

  it('vale por 5 minutos: 4min59s passa; no instante exato (5min) já expirou', async () => {
    const phone = telefone()
    await pedir(phone)
    const codigo = amb.ultimoCodigo()
    banco.clock.advance(5 * 60_000 - 1000)
    await expect(verificar(phone, codigo)).resolves.toBeDefined()

    const outro = telefone()
    await pedir(outro)
    const codigo2 = amb.ultimoCodigo()
    banco.clock.advance(5 * 60_000)
    await expect(verificar(outro, codigo2)).rejects.toMatchObject({ code: 'IDENTITY.OTP_INVALID' })
  })

  it('uso único: o mesmo código não vale duas vezes', async () => {
    const phone = telefone()
    await pedir(phone)
    const codigo = amb.ultimoCodigo()
    await verificar(phone, codigo)
    await expect(verificar(phone, codigo)).rejects.toMatchObject({ code: 'IDENTITY.OTP_INVALID' })
  })

  it('a 5ª tentativa errada bloqueia o código, mesmo que a próxima seja a certa', async () => {
    const phone = telefone()
    await pedir(phone)
    const codigo = amb.ultimoCodigo()
    for (let i = 1; i <= 4; i += 1) {
      await expect(verificar(phone, errado(codigo))).rejects.toMatchObject({ code: 'IDENTITY.OTP_INVALID' })
    }
    await expect(verificar(phone, errado(codigo))).rejects.toMatchObject({ code: 'IDENTITY.OTP_ATTEMPTS_EXCEEDED' })
    await expect(verificar(phone, codigo)).rejects.toMatchObject({ code: 'IDENTITY.OTP_ATTEMPTS_EXCEEDED' })
  })

  it('reenvio invalida o código anterior e não zera os contadores de abuso', async () => {
    const phone = telefone()
    await pedir(phone)
    const primeiro = amb.ultimoCodigo()
    await expect(verificar(phone, errado(primeiro))).rejects.toBeDefined()
    await pedir(phone)
    const segundo = amb.ultimoCodigo()
    await expect(verificar(phone, primeiro)).rejects.toMatchObject({ code: 'IDENTITY.OTP_INVALID' })
    // O novo código tem as próprias 5 tentativas...
    await expect(verificar(phone, segundo)).resolves.toBeDefined()

    // ...mas os envios continuam contando: 3 envios por telefone em 15 min.
    const abusivo = telefone()
    await pedir(abusivo)
    await pedir(abusivo)
    await pedir(abusivo)
    await expect(pedir(abusivo)).rejects.toMatchObject({ code: 'RATE.LIMITED', httpStatus: 429 })
  })

  it('limite por telefone: 3 envios/15 min; libera quando o mais antigo sai da janela', async () => {
    const phone = telefone()
    await pedir(phone)
    banco.clock.advance(60_000)
    await pedir(phone)
    banco.clock.advance(60_000)
    await pedir(phone)
    const bloqueado = await pedir(phone).catch((e: unknown) => e as { retryAfterSeconds?: number; code: string })
    expect(bloqueado).toMatchObject({ code: 'RATE.LIMITED' })
    expect((bloqueado as { retryAfterSeconds: number }).retryAfterSeconds).toBe(13 * 60) // 15 min - 2 min decorridos
    banco.clock.advance(13 * 60_000)
    await expect(pedir(phone)).resolves.toBeDefined()
  })

  it('limite por IP: 10 envios/h para telefones diferentes; outro IP não é afetado', async () => {
    const ip = '198.51.100.7'
    for (let i = 0; i < 10; i += 1) await pedir(telefone(), ip)
    await expect(pedir(telefone(), ip)).rejects.toMatchObject({ code: 'RATE.LIMITED' })
    await expect(pedir(telefone(), '198.51.100.8')).resolves.toBeDefined()
    banco.clock.advance(60 * 60_000)
    await expect(pedir(telefone(), ip)).resolves.toBeDefined()
  })

  it('provedor fora do ar → erro honesto e o código não vale', async () => {
    const phone = telefone()
    amb.notificacoes.nextOutcome = { status: 'transient_failure', reason: 'WhatsMiau 503' }
    await expect(pedir(phone)).rejects.toMatchObject({
      code: 'IDENTITY.OTP_DELIVERY_FAILED',
      httpStatus: 503,
      retryable: true,
      message: 'Não conseguimos enviar o código agora. Tente novamente em instantes.',
    })
    expect(amb.notificacoes.sent.filter((m) => m.toE164 === phone)).toHaveLength(0)
    const [linha] = await banco.db.select().from(otpDesafios).where(eq(otpDesafios.telefone, phone))
    expect(linha?.invalidadoEm).not.toBeNull()
  })

  it('não revela se o número existe: mesma resposta para número novo e com conta, e erros iguais', async () => {
    const com = telefone()
    await amb.post('/identity/otp/send', { telefone: com })
    const v = await amb.post('/identity/otp/verify', { telefone: com, codigo: amb.ultimoCodigo() })
    await amb.post('/identity/otp/complete', {
      continuacao: v.json['continuacao'],
      nome: 'Com Conta',
      aceites: { termos: '1', privacidade: '1' },
    })
    const sem = telefone()
    const respostas = []
    for (const phone of [com, sem]) {
      const envio = await amb.post('/identity/otp/send', { telefone: phone })
      const erro = await amb.post('/identity/otp/verify', { telefone: phone, codigo: errado(amb.ultimoCodigo()) })
      respostas.push({ envio: [envio.status, Object.keys(envio.json)], erro: [erro.status, erro.json['code'], erro.json['message']] })
    }
    expect(respostas[0]).toEqual(respostas[1])
    // Telefone que nunca pediu código: mesmo erro de código inválido.
    const nunca = await amb.post('/identity/otp/verify', { telefone: telefone(), codigo: '123456' })
    expect(nunca.json['code']).toBe('IDENTITY.OTP_INVALID')
  })

  it('telefone fora do padrão brasileiro é recusado antes de enviar qualquer coisa', async () => {
    const antes = amb.notificacoes.sent.length
    const r = await amb.post('/identity/otp/send', { telefone: '+1 415 555 0100' })
    expect(r.status).toBe(422)
    expect(r.json['code']).toBe('IDENTITY.PHONE_INVALID')
    expect(amb.notificacoes.sent).toHaveLength(antes)
  })
})
