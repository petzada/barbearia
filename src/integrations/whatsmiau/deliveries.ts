import { createHash } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import type {
  NotificationChannel,
  NotificationMessage,
} from '~/contracts/ports/notification-provider'
import type { RequestContext } from '~/contracts/context'
import { getDatabase } from '~/platform/db/runtime'
import type { Db } from '~/platform/db/types'
import { newId } from '~/platform/ids'
import { entregas, type DeliveryRow, type DeliveryState } from './schema'

export interface DeliveryInput {
  readonly channel: NotificationChannel
  readonly toE164: string
  readonly text: string
  readonly idempotencyKey: string
  readonly instance?: string
}

export interface DeliveryStore {
  createOrGet(ctx: RequestContext, input: DeliveryInput): Promise<DeliveryRow>
  mark(
    ctx: RequestContext,
    id: string,
    update: {
      readonly state: DeliveryState
      readonly attempts?: number
      readonly externalId?: string | null
      readonly error?: string | null
    },
  ): Promise<void>
  confirmByExternalId(ctx: RequestContext, instance: string, externalId: string): Promise<void>
}

export class DrizzleDeliveryStore implements DeliveryStore {
  constructor(private readonly db: Db = getDatabase()) {}

  async createOrGet(ctx: RequestContext, input: DeliveryInput): Promise<DeliveryRow> {
    const telefoneHash = hash(input.toE164)
    const hashPayload = hash(
      JSON.stringify([input.channel, input.instance ?? null, input.toE164, input.text]),
    )
    await this.db
      .insert(entregas)
      .values({
        id: newId(ctx.clock),
        barbeariaId: ctx.barbeariaId,
        canal: input.channel,
        instancia: input.instance ?? null,
        destinatarioMascarado: maskPhone(input.toE164),
        telefoneHash,
        chaveIdempotente: input.idempotencyKey,
        hashPayload,
        estado: 'pendente',
        criadoEm: ctx.clock.now(),
        atualizadoEm: ctx.clock.now(),
      })
      .onConflictDoNothing({ target: [entregas.barbeariaId, entregas.chaveIdempotente] })
    const [row] = await this.db
      .select()
      .from(entregas)
      .where(
        and(
          eq(entregas.barbeariaId, ctx.barbeariaId),
          eq(entregas.chaveIdempotente, input.idempotencyKey),
        ),
      )
    if (!row) throw new Error('Entrega não encontrada após registrar a intenção.')
    return row
  }

  async mark(
    ctx: RequestContext,
    id: string,
    update: {
      readonly state: DeliveryState
      readonly attempts?: number
      readonly externalId?: string | null
      readonly error?: string | null
    },
  ): Promise<void> {
    await this.db
      .update(entregas)
      .set({
        estado: update.state,
        ...(update.attempts === undefined ? {} : { tentativas: update.attempts }),
        ...(update.externalId === undefined ? {} : { idExterno: update.externalId }),
        ...(update.error === undefined ? {} : { ultimoErro: update.error }),
        atualizadoEm: ctx.clock.now(),
      })
      .where(and(eq(entregas.id, id), eq(entregas.barbeariaId, ctx.barbeariaId)))
  }

  async confirmByExternalId(
    ctx: RequestContext,
    instance: string,
    externalId: string,
  ): Promise<void> {
    await this.db
      .update(entregas)
      .set({ estado: 'confirmado', atualizadoEm: ctx.clock.now(), ultimoErro: null })
      .where(
        and(
          eq(entregas.barbeariaId, ctx.barbeariaId),
          eq(entregas.instancia, instance),
          eq(entregas.idExterno, externalId),
          eq(entregas.estado, 'enviado'),
        ),
      )
  }
}

export function messageInput(message: NotificationMessage, instance?: string): DeliveryInput {
  return {
    channel: message.channel,
    toE164: message.toE164,
    text: message.text,
    idempotencyKey: message.idempotencyKey,
    ...(instance === undefined ? {} : { instance }),
  }
}

export function payloadMatches(row: DeliveryRow, input: DeliveryInput): boolean {
  return (
    row.hashPayload ===
    hash(JSON.stringify([input.channel, input.instance ?? null, input.toE164, input.text]))
  )
}

export function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function maskPhone(phone: string): string {
  const visiblePrefix = phone.slice(0, Math.min(3, phone.length - 4))
  return `${visiblePrefix}${'*'.repeat(Math.max(phone.length - visiblePrefix.length - 4, 0))}${phone.slice(-4)}`
}

export function validE164(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value)
}

export function publicExternalId(row: DeliveryRow): string {
  return row.idExterno ?? `whatsmiau-local:${row.id}`
}
