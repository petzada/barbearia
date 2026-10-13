import { createHash } from 'node:crypto'

/** JSON canônico: chaves ordenadas, `undefined` omitido, Date em ISO, bigint em texto. Mesmo dado → mesmos bytes. */
function canonico(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'bigint') return value.toString()
  if (Array.isArray(value)) return value.map((item) => canonico(item) ?? null)
  if (value !== null && typeof value === 'object') {
    const saida: Record<string, unknown> = {}
    for (const chave of Object.keys(value).sort()) {
      const item = canonico((value as Record<string, unknown>)[chave])
      if (item !== undefined) saida[chave] = item
    }
    return saida
  }
  return value
}

/** SHA-256 hexadecimal do payload canônico: identifica "o mesmo pedido" para a idempotência. */
export function hashPayload(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonico(value)) ?? 'null')
    .digest('hex')
}
