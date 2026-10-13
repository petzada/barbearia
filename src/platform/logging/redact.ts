// PRD §7.8: logs e auditoria nunca carregam OTP, token, cartão ou payload pessoal completo; telefone sai mascarado.
// Este módulo é a redaction central: o logger, o AuditWriter e o MetricsSink (T36) reusam as mesmas regras.

export const REDACTED = '[redigido]'

/**
 * Chaves cujo valor NUNCA é registrado. Comparação por trecho, sem maiúsculas nem separadores
 * (`session_token`, `sessionToken` e `SESSIONTOKEN` valem o mesmo). Conservadora de propósito.
 * `code`/`codigo` ficam de fora: são códigos de erro; `assinatura` também (é o agregado de negócio: `assinaturaId`). O código de login chama-se `otp` ou `codigoVerificacao`.
 */
const TRECHOS_SECRETOS = [
  'otp',
  'token',
  'password',
  'senha',
  'secret',
  'segredo',
  'authorization',
  'cookie',
  'cvv',
  'apikey',
  'cartao',
  'cardnumber',
  'privatekey',
  'signature', // assinatura criptográfica (x-signature, x-openpix-signature)
  'hmac',
  'verificationcode',
  'codigoverificacao',
]

function chaveSecreta(chave: string): boolean {
  const normal = chave.toLowerCase().replace(/[_-]/g, '')
  return normal === 'pan' || normal === 'card' || TRECHOS_SECRETOS.some((t) => normal.includes(t))
}

/** Chaves que carregam telefone: o valor sai mascarado, não removido. */
const CHAVE_TELEFONE = /(telefone|phone|whatsapp|celular|msisdn|e164)/i

/** Telefones em texto livre (E.164 ou 10–13 dígitos): `+5511987654321`, `11987654321`. */
// Bordas `(?<![\w-])`/`(?![\w-])`: não casa pedaço de UUID, id de correlação ou número maior.
const TELEFONE_EM_TEXTO = /(?<![\w-])\+?\d[\d\s().-]{8,16}\d(?![\w-])/g

/** `+5511987654321` → `+55*******4321`: mantém o código do país e os 4 últimos dígitos. */
export function maskPhone(value: string): string {
  const digitos = value.replace(/\D/g, '')
  if (digitos.length < 8) return REDACTED
  const pais = value.trim().startsWith('+') ? `+${digitos.slice(0, 2)}` : ''
  const meio = '*'.repeat(Math.max(digitos.length - 4 - (pais ? 2 : 0), 3))
  return `${pais}${meio}${digitos.slice(-4)}`
}

export function maskPhonesInText(text: string): string {
  return text.replace(TELEFONE_EM_TEXTO, (achado) => {
    const digitos = achado.replace(/\D/g, '')
    return digitos.length >= 10 && digitos.length <= 15 ? maskPhone(achado) : achado
  })
}

const PROFUNDIDADE_MAXIMA = 8

/**
 * Cópia profunda segura para log/auditoria: remove segredos por nome de chave, mascara telefones
 * (por chave e dentro de textos) e corta estruturas circulares ou muito fundas.
 */
export function redactSensitive(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') return maskPhonesInText(value)
  if (value === null || typeof value !== 'object') return value
  if (value instanceof Date) return value.toISOString()
  if (depth >= PROFUNDIDADE_MAXIMA) return '[profundidade excedida]'
  if (seen.has(value)) return '[circular]'
  seen.add(value)
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item, depth + 1, seen))
  if (value instanceof Error) {
    // A stack fica só no log do servidor; nunca em `Result` (ver `errorToResult`).
    return {
      name: value.name,
      message: maskPhonesInText(value.message),
      ...(value.stack ? { stack: maskPhonesInText(value.stack) } : {}),
    }
  }
  const saida: Record<string, unknown> = {}
  for (const [chave, item] of Object.entries(value)) {
    if (chaveSecreta(chave)) {
      saida[chave] = REDACTED
    } else if (CHAVE_TELEFONE.test(chave) && typeof item === 'string') {
      saida[chave] = maskPhone(item)
    } else {
      saida[chave] = redactSensitive(item, depth + 1, seen)
    }
  }
  return saida
}
