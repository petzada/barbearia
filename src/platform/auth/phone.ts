/**
 * RN01: telefone sempre normalizado para E.164 antes de comparar. Validação brasileira: DDI 55 opcional, DDD de
 * dois dígitos (11–99, sem zero) e celular de 9 dígitos começando em 9 (WhatsApp). Número estrangeiro e fixo
 * são recusados (`null`); quem usa outro país precisa de decisão de produto.
 */
const CELULAR_BR = /^55([1-9][1-9])(9\d{8})$/

export function normalizeBrazilianPhone(raw: string): string | null {
  const digitos = raw.replace(/[\s().-]/g, '')
  if (!/^\+?\d+$/.test(digitos)) return null
  const soDigitos = digitos.startsWith('+') ? digitos.slice(1) : digitos
  // Sem DDI: 11 dígitos (DDD + 9 + 8). Com DDI: 13 dígitos. `+` explícito exige o DDI 55.
  const comDdi = digitos.startsWith('+') || soDigitos.length === 13 ? soDigitos : `55${soDigitos}`
  const achado = CELULAR_BR.exec(comDdi)
  return achado ? `+55${achado[1]}${achado[2]}` : null
}

export function isE164Brazilian(valor: string): boolean {
  return /^\+55[1-9][1-9]9\d{8}$/.test(valor)
}
