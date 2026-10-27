import { describe, expect, it } from 'vitest'
import {
  assinanteAcompanhaAvulso,
  formatPercentualBasisPoints,
  parsePercentual,
} from '../../src/modules/catalog/ui/format'

describe('percentual da matriz do catálogo', () => {
  it('volta a pontos-base o mesmo texto que a matriz exibe', () => {
    for (const bp of [0, 5, 2_550, 3_500, 10_000]) {
      expect(parsePercentual(formatPercentualBasisPoints(bp))).toBe(bp)
    }
  })

  it('aceita o número puro, vírgula ou ponto, e rejeita o que não é percentual', () => {
    expect(parsePercentual('35')).toBe(3_500)
    expect(parsePercentual(' 25,5 % ')).toBe(2_550)
    expect(parsePercentual('25.50')).toBe(2_550)
    expect(parsePercentual('100,01%')).toBeNull()
    expect(parsePercentual('%35')).toBeNull()
    expect(parsePercentual('35%%')).toBeNull()
    expect(parsePercentual('')).toBeNull()
  })

  it('o assinante só acompanha o avulso quando está vazio ou igual (D0023)', () => {
    expect(assinanteAcompanhaAvulso(null, null)).toBe(true)
    expect(assinanteAcompanhaAvulso(3_500, null)).toBe(true)
    expect(assinanteAcompanhaAvulso(3_500, 3_500)).toBe(true)
    expect(assinanteAcompanhaAvulso(4_000, 2_500)).toBe(false)
  })
})
