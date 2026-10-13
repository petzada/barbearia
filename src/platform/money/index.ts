// Dinheiro em centavos inteiros (PRD §6.1, §7.3). Float é proibido: nenhuma função aqui converte
// de/para número decimal. `Money` é um inteiro seguro com marca de tipo; no banco é `bigint` (ver `centavos()`).

declare const moneyBrand: unique symbol

export type Money = number & { readonly [moneyBrand]: true }

export class MoneyError extends RangeError {
  constructor(message: string) {
    super(message)
    this.name = 'MoneyError'
  }
}

export function money(centavos: number): Money {
  if (!Number.isSafeInteger(centavos)) {
    throw new MoneyError(`Valor em centavos deve ser inteiro seguro; recebido ${centavos}.`)
  }
  return centavos as Money
}

export const ZERO: Money = money(0)

export function addMoney(a: Money, b: Money): Money {
  return money(a + b)
}

export function subtractMoney(a: Money, b: Money): Money {
  return money(a - b)
}

export function sumMoney(values: readonly Money[]): Money {
  return values.reduce((total, valor) => addMoney(total, valor), ZERO)
}

/** Multiplica por quantidade inteira (nunca por fator decimal). */
export function multiplyMoney(value: Money, quantity: number): Money {
  if (!Number.isInteger(quantity)) throw new MoneyError(`Quantidade deve ser inteira: ${quantity}.`)
  return money(value * quantity)
}

/**
 * Percentual em pontos-base (10000 bp = 100%) com arredondamento meio para cima (PRD §7.3).
 * 5000 bp de 1 centavo = 1 centavo; 3333 bp de R$ 129,90 = R$ 43,30. Usa BigInt no produto para não
 * perder precisão. Só aceita base e percentual não negativos: o PRD não define arredondamento de
 * valores negativos, e estorno é um lançamento próprio (positivo), não um percentual negativo.
 */
export function applyBasisPoints(base: Money, basisPoints: number): Money {
  if (base < 0) throw new MoneyError('applyBasisPoints exige base não negativa.')
  if (!Number.isInteger(basisPoints) || basisPoints < 0) {
    throw new MoneyError(`Pontos-base devem ser inteiro não negativo; recebido ${basisPoints}.`)
  }
  const produto = BigInt(base) * BigInt(basisPoints)
  return money(Number((produto + 5000n) / 10000n))
}

/** `R$ 1.299,90`; negativo: `-R$ 5,00`. Sem Intl para não depender de espaços especiais do ICU. */
export function formatBRL(value: Money): string {
  const negativo = value < 0
  const absoluto = Math.abs(value)
  const reais = Math.trunc(absoluto / 100)
  const centavos = absoluto % 100
  const reaisComPontos = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${negativo ? '-' : ''}R$ ${reaisComPontos},${String(centavos).padStart(2, '0')}`
}

const PADRAO_BRL = /^(-)?\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/

/** Lê um valor digitado em reais (`129,90`, `R$ 1.299,90`, `129`) sem passar por float. */
export function parseBRL(text: string): Money {
  const partes = PADRAO_BRL.exec(text.trim())
  if (!partes) throw new MoneyError('Valor em reais inválido (use o formato 129,90).')
  const [, sinal, inteiro, decimais] = partes
  const reais = Number((inteiro ?? '0').replace(/\./g, ''))
  const centavos = Number((decimais ?? '').padEnd(2, '0') || '0')
  const total = money(reais * 100 + centavos)
  return sinal ? money(-total) : total
}
