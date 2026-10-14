/** Só dígitos, no máximo 11 (DDD + 9 dígitos). Máscara de digitação; a validação é do servidor. */
export function phoneDigits(texto: string): string {
  return texto.replace(/\D/g, '').slice(0, 11)
}

/** `11987654321` → `(11) 98765-4321`; parcial enquanto o usuário digita. */
export function formatPhoneMask(digitos: string): string {
  const d = phoneDigits(digitos)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  const ddd = d.slice(0, 2)
  const resto = d.slice(2)
  if (resto.length <= 4) return `(${ddd}) ${resto}`
  const corte = resto.length > 8 ? 5 : 4
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`
}
