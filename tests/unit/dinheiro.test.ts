import { describe, expect, it } from 'vitest'
import {
  addMoney,
  applyBasisPoints,
  formatBRL,
  money,
  MoneyError,
  multiplyMoney,
  parseBRL,
  subtractMoney,
  sumMoney,
  ZERO,
} from '~/platform/money'

describe('Money', () => {
  it('só aceita inteiro seguro (nada de float)', () => {
    expect(() => money(129.9)).toThrow(MoneyError)
    expect(() => money(Number.NaN)).toThrow(MoneyError)
    expect(() => money(Number.MAX_SAFE_INTEGER + 1)).toThrow(MoneyError)
    expect(money(12990)).toBe(12990)
  })

  it('soma, subtrai e multiplica por quantidade inteira', () => {
    expect(addMoney(money(10), money(5))).toBe(15)
    expect(subtractMoney(money(10), money(15))).toBe(-5)
    expect(sumMoney([money(1), money(2), money(3)])).toBe(6)
    expect(sumMoney([])).toBe(ZERO)
    expect(multiplyMoney(money(1999), 3)).toBe(5997)
    expect(() => multiplyMoney(money(100), 1.5)).toThrow(MoneyError)
  })
})

// PRD §7.3: arredondamento meio para cima, em pontos-base.
describe('applyBasisPoints', () => {
  it('5000 bp de 1 centavo = 1 centavo (0,5 sobe)', () => {
    expect(applyBasisPoints(money(1), 5000)).toBe(1)
  })

  it('3333 bp de R$ 129,90 = R$ 43,30 (43,2957 sobe)', () => {
    expect(applyBasisPoints(money(12990), 3333)).toBe(4330)
  })

  it('exatos não mudam; abaixo de meio desce; meio exato sobe', () => {
    expect(applyBasisPoints(money(10000), 5000)).toBe(5000)
    expect(applyBasisPoints(money(12990), 10000)).toBe(12990)
    expect(applyBasisPoints(money(12990), 0)).toBe(0)
    expect(applyBasisPoints(money(1), 4999)).toBe(0)
    expect(applyBasisPoints(money(3), 5000)).toBe(2) // 1,5 → 2
    expect(applyBasisPoints(money(5), 1000)).toBe(1) // 0,5 → 1
    expect(applyBasisPoints(money(4), 1000)).toBe(0) // 0,4 → 0
  })

  it('aceita percentuais acima de 100% (reajuste) e valores grandes sem perder precisão', () => {
    expect(applyBasisPoints(money(10000), 12000)).toBe(12000)
    expect(applyBasisPoints(money(900_000_000_000_000), 3333)).toBe(299_970_000_000_000)
  })

  it('recusa base negativa e percentual inválido', () => {
    expect(() => applyBasisPoints(money(-1), 5000)).toThrow(MoneyError)
    expect(() => applyBasisPoints(money(100), -1)).toThrow(MoneyError)
    expect(() => applyBasisPoints(money(100), 33.3)).toThrow(MoneyError)
  })
})

describe('formatBRL e parseBRL', () => {
  it('formata em reais com separadores brasileiros', () => {
    expect(formatBRL(money(0))).toBe('R$ 0,00')
    expect(formatBRL(money(5))).toBe('R$ 0,05')
    expect(formatBRL(money(12990))).toBe('R$ 129,90')
    expect(formatBRL(money(129990))).toBe('R$ 1.299,90')
    expect(formatBRL(money(123_456_789))).toBe('R$ 1.234.567,89')
    expect(formatBRL(money(-500))).toBe('-R$ 5,00')
  })

  it('lê valores digitados sem passar por float', () => {
    expect(parseBRL('129,90')).toBe(12990)
    expect(parseBRL('R$ 1.299,90')).toBe(129990)
    expect(parseBRL('129')).toBe(12900)
    expect(parseBRL('129,9')).toBe(12990)
    expect(parseBRL('0,05')).toBe(5)
    expect(parseBRL(' R$129,00 ')).toBe(12900)
    expect(parseBRL('-5,00')).toBe(-500)
  })

  it('rejeita formatos ambíguos ou com float', () => {
    for (const texto of ['129.90', '1,299.90', '12,345', 'abc', '', '1e3', '129,999']) {
      expect(() => parseBRL(texto)).toThrow(MoneyError)
    }
  })
})
