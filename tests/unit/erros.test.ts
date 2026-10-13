import { describe, expect, it } from 'vitest'
import { ok, pending } from '~/contracts'
import {
  AppError,
  AuthErrors,
  ConcurrencyErrors,
  DependencyErrors,
  IdempotencyErrors,
  RateErrors,
  SystemErrors,
  ValidationErrors,
  defineErrors,
  errorToResult,
  httpStatusOf,
} from '~/platform/errors'

describe('defineErrors (formato de erros de módulo)', () => {
  const SchedulingErrors = defineErrors('SCHEDULING', {
    SLOT_UNAVAILABLE: { httpStatus: 409, message: 'Este horário não está mais disponível.' },
    TOO_MANY: { httpStatus: 429, message: 'Muitas tentativas.', retryable: true },
  })

  it('gera códigos namespaced e erros tipados', () => {
    expect(SchedulingErrors.codes.SLOT_UNAVAILABLE).toBe('SCHEDULING.SLOT_UNAVAILABLE')
    const erro = SchedulingErrors.SLOT_UNAVAILABLE()
    expect(erro).toBeInstanceOf(AppError)
    expect(erro.code).toBe('SCHEDULING.SLOT_UNAVAILABLE')
    expect(erro.httpStatus).toBe(409)
    expect(erro.retryable).toBe(false)
    expect(SchedulingErrors.TOO_MANY({ retryAfterSeconds: 30 }).retryAfterSeconds).toBe(30)
  })

  it('aceita campos e mensagem própria sem perder o código', () => {
    const erro = SchedulingErrors.SLOT_UNAVAILABLE({
      message: 'Outro cliente reservou agora.',
      fields: [{ path: 'inicio', message: 'Indisponível.' }],
    })
    expect(erro.message).toBe('Outro cliente reservou agora.')
    expect(erro.fields).toEqual([{ path: 'inicio', message: 'Indisponível.' }])
  })

  it('recusa prefixo e nome fora do padrão', () => {
    expect(() => defineErrors('scheduling', {})).toThrow()
    expect(() =>
      defineErrors('SCHEDULING', { slotUnavailable: { httpStatus: 409, message: 'x' } }),
    ).toThrow()
  })
})

describe('erros genéricos do PRD §7.3 e mapeamento HTTP', () => {
  it.each([
    [AuthErrors.REQUIRED(), 'AUTH.REQUIRED', 401],
    [AuthErrors.FORBIDDEN(), 'AUTH.FORBIDDEN', 403],
    [AuthErrors.RECENT_REQUIRED(), 'AUTH.RECENT_REQUIRED', 401],
    [ValidationErrors.FAILED(), 'VALIDATION.FAILED', 422],
    [ConcurrencyErrors.REVISION_CONFLICT(), 'CONCURRENCY.REVISION_CONFLICT', 409],
    [IdempotencyErrors.KEY_REUSED(), 'IDEMPOTENCY.KEY_REUSED', 422],
    [RateErrors.LIMITED({ retryAfterSeconds: 10 }), 'RATE.LIMITED', 429],
    [DependencyErrors.UNAVAILABLE(), 'DEPENDENCY.UNAVAILABLE', 503],
    [SystemErrors.RECOVERY_MODE(), 'SYSTEM.RECOVERY_MODE', 503],
  ])('%s', (erro, codigo, status) => {
    expect(erro.code).toBe(codigo)
    expect(erro.httpStatus).toBe(status)
    const resultado = errorToResult(erro, 'corr-12345')
    expect(httpStatusOf(resultado)).toBe(status)
    expect(resultado.correlationId).toBe('corr-12345')
  })

  it('429 e 503 de dependência são retentáveis; os demais não', () => {
    expect(RateErrors.LIMITED().retryable).toBe(true)
    expect(DependencyErrors.UNAVAILABLE().retryable).toBe(true)
    expect(AuthErrors.FORBIDDEN().retryable).toBe(false)
  })

  it('ok e pending têm 200 e 202', () => {
    expect(httpStatusOf(ok({ id: 1 }, 3))).toBe(200)
    expect(httpStatusOf(pending({ operationId: 'op-1' }))).toBe(202)
  })
})

describe('errorToResult nunca expõe detalhes internos', () => {
  it('erro desconhecido (SQL, stack) vira SYSTEM.INTERNAL genérico', () => {
    const interno = new Error(
      'select * from usuarios where telefone = $1 -- stack em /srv/app/x.ts:10',
    )
    const resultado = errorToResult(interno, 'corr-abc12345')
    expect(resultado.code).toBe('SYSTEM.INTERNAL')
    expect(resultado.httpStatus).toBe(500)
    expect(JSON.stringify(resultado)).not.toMatch(/select|usuarios|stack|\.ts/)
  })

  it('AppError mantém mensagem segura, campos e retryAfter; a causa interna não vai no resultado', () => {
    const erro = RateErrors.LIMITED({
      retryAfterSeconds: 45,
      cause: new Error('detalhe interno secreto'),
    })
    const resultado = errorToResult(erro, 'corr-abc12345')
    expect(resultado).toMatchObject({ status: 'error', retryAfterSeconds: 45, retryable: true })
    expect(JSON.stringify(resultado)).not.toContain('secreto')
  })
})
