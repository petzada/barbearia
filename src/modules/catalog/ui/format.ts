export function formatPercentualBasisPoints(percentualBp: number): string {
  const inteiro = Math.trunc(percentualBp / 100)
  const fracao = percentualBp % 100
  return fracao === 0 ? `${inteiro}%` : `${inteiro},${String(fracao).padStart(2, '0')}%`
}

export function parsePercentual(texto: string): number | null {
  const partes = /^\s*(\d{1,3})(?:[,.](\d{1,2}))?\s*$/.exec(texto)
  if (!partes) return null
  const inteiro = Number(partes[1])
  const fracao = Number((partes[2] ?? '').padEnd(2, '0') || '0')
  const bp = inteiro * 100 + fracao
  return bp <= 10_000 ? bp : null
}

export function brlInputFromCents(centavos: number): string {
  return `${Math.trunc(centavos / 100)},${String(centavos % 100).padStart(2, '0')}`
}
