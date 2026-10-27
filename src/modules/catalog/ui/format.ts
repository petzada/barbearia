export function formatPercentualBasisPoints(percentualBp: number): string {
  const inteiro = Math.trunc(percentualBp / 100)
  const fracao = percentualBp % 100
  return fracao === 0 ? `${inteiro}%` : `${inteiro},${String(fracao).padStart(2, '0')}%`
}

// Aceita o texto que `formatPercentualBasisPoints` produz (com `%` final) e o número puro digitado.
export function parsePercentual(texto: string): number | null {
  const partes = /^\s*(\d{1,3})(?:[,.](\d{1,2}))?\s*%?\s*$/.exec(texto)
  if (!partes) return null
  const inteiro = Number(partes[1])
  const fracao = Number((partes[2] ?? '').padEnd(2, '0') || '0')
  const bp = inteiro * 100 + fracao
  return bp <= 10_000 ? bp : null
}

/** D0023: avulso e assinante são dois percentuais; igual é só o padrão do cadastro novo. */
export function assinanteAcompanhaAvulso(
  avulsoBp: number | null,
  assinanteBp: number | null,
): boolean {
  return assinanteBp === null || assinanteBp === avulsoBp
}

export function brlInputFromCents(centavos: number): string {
  return `${Math.trunc(centavos / 100)},${String(centavos % 100).padStart(2, '0')}`
}
