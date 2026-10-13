import { randomBytes } from 'node:crypto'
import type { Clock } from '~/contracts/clock'

// UUID v7 (RFC 9562): 48 bits de milissegundos + versão 7 + 12 bits de contador + variante + 62 bits aleatórios.
// Ordenável no tempo (bom para índices B-tree) e monotônico dentro do processo (PRD §6.1, D0019).

const PADRAO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PADRAO_UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

let ultimoMs = 0
let contador = 0

function proximoContador(milissegundos: number): { ms: number; counter: number } {
  if (milissegundos > ultimoMs) {
    ultimoMs = milissegundos
    contador = randomBytes(2).readUInt16BE(0) & 0x7ff // começa na metade baixa: sobra espaço para incrementar
  } else {
    contador += 1
    if (contador > 0xfff) {
      ultimoMs += 1
      contador = 0
    }
  }
  return { ms: ultimoMs, counter: contador }
}

/** Gera um UUID v7. Aceita um `Clock` para testes; sem ele usa o relógio do sistema. */
export function newId(clock?: Clock): string {
  const agora = clock ? clock.now().getTime() : Date.now()
  const { ms, counter } = proximoContador(agora)
  const bytes = Buffer.alloc(16)
  bytes.writeUIntBE(ms, 0, 6)
  bytes.writeUInt16BE(0x7000 | counter, 6)
  randomBytes(8).copy(bytes, 8)
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function isUuid(value: string): boolean {
  return PADRAO_UUID.test(value)
}

export function isUuidV7(value: string): boolean {
  return PADRAO_UUID_V7.test(value)
}

/** Instante (ms) embutido num UUID v7. */
export function uuidV7Timestamp(id: string): Date {
  if (!isUuidV7(id)) throw new RangeError('Não é um UUID v7.')
  return new Date(Number.parseInt(id.replace(/-/g, '').slice(0, 12), 16))
}
