import { createHash } from 'node:crypto'

/** PRD §7.6 / T03: corpo de webhook limitado a 256 KB. */
export const MAX_WEBHOOK_BODY_BYTES = 256 * 1024

export class BodyTooLargeError extends Error {
  constructor(readonly limitBytes: number) {
    super(`Corpo maior que ${limitBytes} bytes.`)
    this.name = 'BodyTooLargeError'
  }
}

export function sha256Hex(texto: string): string {
  return createHash('sha256').update(texto, 'utf8').digest('hex')
}

/** Lê o corpo aos pedaços e aborta assim que passar do limite (não carrega corpo gigante na memória). */
export async function readBodyLimited(request: Request, limitBytes: number): Promise<string> {
  const declarado = Number(request.headers.get('content-length'))
  if (Number.isFinite(declarado) && declarado > limitBytes) throw new BodyTooLargeError(limitBytes)
  if (!request.body) return ''
  const leitor = request.body.getReader()
  const pedacos: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await leitor.read()
    if (done) break
    total += value.byteLength
    if (total > limitBytes) {
      await leitor.cancel()
      throw new BodyTooLargeError(limitBytes)
    }
    pedacos.push(value)
  }
  return new TextDecoder('utf-8').decode(Buffer.concat(pedacos))
}

export const CARD_REMOVED = '[cartao-removido]'

function luhnValido(digitos: string): boolean {
  let soma = 0
  for (let i = 0; i < digitos.length; i += 1) {
    let d = Number(digitos.charAt(digitos.length - 1 - i))
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    soma += d
  }
  return soma % 10 === 0
}

// Bandeiras com prefixo (IIN) e tamanho conhecidos; reduz falso positivo em ids numéricos longos.
const BANDEIRAS: ReadonlyArray<{ prefixo: RegExp; tamanhos: readonly number[] }> = [
  { prefixo: /^4/, tamanhos: [13, 16, 19] }, // Visa
  { prefixo: /^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/, tamanhos: [16] }, // Mastercard
  { prefixo: /^3[47]/, tamanhos: [15] }, // Amex
  { prefixo: /^(6011|65|64[4-9])/, tamanhos: [16, 19] }, // Discover
  { prefixo: /^(636368|438935|504175|451416|636297|5067|4576|4011|506699)/, tamanhos: [16] }, // Elo
  { prefixo: /^(606282|3841)/, tamanhos: [13, 16, 19] }, // Hipercard
  { prefixo: /^(30[0-5]|36|38)/, tamanhos: [14, 16] }, // Diners
  { prefixo: /^35(2[89]|[3-8]\d)/, tamanhos: [16, 19] }, // JCB
]

function pareceCartao(digitos: string): boolean {
  return (
    BANDEIRAS.some((b) => b.prefixo.test(digitos) && b.tamanhos.includes(digitos.length)) &&
    luhnValido(digitos)
  )
}

const SEQUENCIA_NUMERICA = /(?<![\d])\d(?:[ -]?\d){12,18}(?![\d])/g

/**
 * Remove do texto qualquer sequência que seja número de cartão (bandeira conhecida + tamanho + Luhn), com ou
 * sem espaços/hífens. Defesa em profundidade: webhooks de provedor não carregam PAN, mas o inbox guarda o
 * corpo bruto e nunca pode virar depósito de dado de cartão (PRD §7.8).
 */
export function scrubCardData(texto: string): string {
  return texto.replace(SEQUENCIA_NUMERICA, (achado) =>
    pareceCartao(achado.replace(/\D/g, '')) ? CARD_REMOVED : achado,
  )
}
