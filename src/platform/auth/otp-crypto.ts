import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

/** RN01: código de 6 dígitos, gerado com fonte criptográfica. */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

/**
 * Hash do código (RN01: nunca guardar o código). HMAC com o segredo do servidor e o id do desafio: sem o
 * segredo, um vazamento do banco não permite testar os 10^6 códigos offline, e o mesmo código em desafios
 * diferentes gera hashes diferentes.
 */
export function hashOtpCode(input: { code: string; challengeId: string; secret: string }): string {
  return createHmac('sha256', input.secret).update(`otp:${input.challengeId}:${input.code}`).digest('hex')
}

export function hashSecretValue(input: { value: string; purpose: string; secret: string }): string {
  return createHmac('sha256', input.secret).update(`${input.purpose}:${input.value}`).digest('hex')
}

export function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex')
  const bufB = Buffer.from(b, 'hex')
  return bufA.length === bufB.length && bufA.length > 0 && timingSafeEqual(bufA, bufB)
}

/** Token opaco de uso único (continuação do primeiro acesso). */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url')
}
