import { describe, expect, it } from 'vitest'
import { isUuid, isUuidV7, newId, uuidV7Timestamp } from '~/platform/ids'
import { createManualClock } from '~/platform/time'

describe('UUID v7', () => {
  it('tem versão 7 e variante RFC 4122', () => {
    const id = newId()
    expect(isUuid(id)).toBe(true)
    expect(isUuidV7(id)).toBe(true)
    expect(id[14]).toBe('7')
    expect('89ab').toContain(id[19] ?? '')
  })

  it('é único e estritamente crescente numa rajada (ordem de criação = ordem lexicográfica)', () => {
    const ids = Array.from({ length: 5000 }, () => newId())
    expect(new Set(ids).size).toBe(ids.length)
    expect([...ids].sort()).toEqual(ids)
  })

  it('embute o instante do relógio recebido (ms desde a época)', () => {
    const futuro = createManualClock('2099-06-15T12:00:00.123Z')
    const id = newId(futuro)
    expect(uuidV7Timestamp(id).toISOString()).toBe('2099-06-15T12:00:00.123Z')
  })

  it('segue crescente mesmo se o relógio voltar (monotonia dentro do processo)', () => {
    const relogio = createManualClock('2099-06-15T12:00:00Z')
    const a = newId(relogio)
    relogio.set('2099-06-15T11:59:59Z')
    const b = newId(relogio)
    expect(b > a).toBe(true)
  })

  it('rejeita o que não é UUID v7', () => {
    expect(isUuidV7('não é uuid')).toBe(false)
    expect(isUuidV7('550e8400-e29b-41d4-a716-446655440000')).toBe(false) // v4
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(() => uuidV7Timestamp('550e8400-e29b-41d4-a716-446655440000')).toThrow(RangeError)
  })
})
