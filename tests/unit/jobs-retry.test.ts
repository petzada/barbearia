import { describe, expect, it } from 'vitest'
import { AppError } from '../../src/platform/errors/app-error'
import { SystemErrors } from '../../src/platform/errors/generic'
import {
  classifyFailure,
  classifyHttpStatus,
  describeError,
  parseRetryAfter,
  PermanentJobError,
  RetryableJobError,
} from '../../src/platform/jobs/failures'
import {
  DEFAULT_RETRY_POLICY,
  defineRetryPolicy,
  nextRetryDelayMs,
} from '../../src/platform/jobs/retry'

const MIN = 60_000

describe('política de retentativa (PRD §7.6)', () => {
  it('padrão: imediato, 1, 5, 15 e 60 minutos; depois esgota', () => {
    const semJitter = defineRetryPolicy({ jitterRatio: 0 })
    const esperas = [0, 1, 2, 3, 4, 5].map((i) => nextRetryDelayMs(semJitter, i))
    expect(esperas).toEqual([0, 1 * MIN, 5 * MIN, 15 * MIN, 60 * MIN, null])
  })

  it('jitter fica dentro de ±20% e não mexe na retentativa imediata', () => {
    expect(nextRetryDelayMs(DEFAULT_RETRY_POLICY, 0, () => 0.99)).toBe(0)
    expect(nextRetryDelayMs(DEFAULT_RETRY_POLICY, 2, () => 0)).toBe(4 * MIN) // 5 min − 20%
    expect(nextRetryDelayMs(DEFAULT_RETRY_POLICY, 2, () => 1)).toBe(6 * MIN) // 5 min + 20%
    for (let i = 0; i < 200; i += 1) {
      const espera = nextRetryDelayMs(DEFAULT_RETRY_POLICY, 3) ?? -1
      expect(espera).toBeGreaterThanOrEqual(12 * MIN)
      expect(espera).toBeLessThanOrEqual(18 * MIN)
    }
  })

  it('Retry-After do provedor só aumenta a espera', () => {
    const p = defineRetryPolicy({ delaysMs: [1000], jitterRatio: 0 })
    expect(nextRetryDelayMs(p, 0, Math.random, 5000)).toBe(5000)
    expect(nextRetryDelayMs(p, 0, Math.random, 10)).toBe(1000)
  })

  it('é configurável por fila e valida entrada', () => {
    expect(defineRetryPolicy({ delaysMs: [10, 20] }).delaysMs).toEqual([10, 20])
    expect(() => defineRetryPolicy({ delaysMs: [-1] })).toThrow(RangeError)
    expect(() => defineRetryPolicy({ jitterRatio: 1 })).toThrow(RangeError)
  })
})

describe('classificação de falhas', () => {
  it('permanente: PermanentJobError e AppError não retentável', () => {
    expect(classifyFailure(new PermanentJobError('x')).kind).toBe('permanent')
    expect(classifyFailure(SystemErrors.INTERNAL()).kind).toBe('permanent')
  })

  it('transitória: erro comum, RetryableJobError (com retryAfter) e AppError retentável', () => {
    expect(classifyFailure(new Error('timeout')).kind).toBe('transient')
    expect(classifyFailure(new RetryableJobError('429', { retryAfterMs: 3000 }))).toEqual({
      kind: 'transient',
      retryAfterMs: 3000,
    })
    const retentavel = new AppError({
      code: 'DEPENDENCY.UNAVAILABLE',
      message: 'x',
      httpStatus: 503,
      retryable: true,
      retryAfterSeconds: 2,
    })
    expect(classifyFailure(retentavel)).toEqual({ kind: 'transient', retryAfterMs: 2000 })
  })

  it('HTTP: 408/425/429/5xx são transitórios; os demais 4xx são erro de configuração', () => {
    for (const status of [408, 425, 429, 500, 502, 503, 504])
      expect(classifyHttpStatus(status)).toBe('transient')
    for (const status of [400, 401, 403, 404, 409, 422])
      expect(classifyHttpStatus(status)).toBe('permanent')
  })

  it('Retry-After em segundos e em data HTTP', () => {
    const agora = new Date('2027-01-01T00:00:00Z')
    expect(parseRetryAfter('120', agora)).toBe(120_000)
    expect(parseRetryAfter('Fri, 01 Jan 2027 00:00:30 GMT', agora)).toBe(30_000)
    expect(parseRetryAfter('Thu, 31 Dec 2026 23:59:00 GMT', agora)).toBe(0)
    expect(parseRetryAfter('lixo', agora)).toBeUndefined()
    expect(parseRetryAfter(null, agora)).toBeUndefined()
  })

  it('describeError mascara telefone, corta o tamanho e nunca devolve segredo por chave', () => {
    expect(describeError(new Error('falhou para +5511987654321'))).not.toContain('987654321')
    expect(describeError(new Error('x'.repeat(2000))).length).toBeLessThanOrEqual(501)
  })
})
