import type { Clock } from '~/contracts/clock'
import type { NotificationProvider } from '~/contracts/ports/notification-provider'
import type { Outbox } from '~/contracts/ports/outbox'
import { getDatabase } from '~/platform/db/runtime'
import type { Db } from '~/platform/db/types'
import { systemClock } from '~/platform/time/clock'
import { loadEnv } from '~/platform/validation/env'
import { DEFAULT_IDENTITY_CONFIG, type IdentityConfig } from '../config'
import { getIdentityOutbox, getNotificationProvider } from './ports'

/** Tudo que os casos de uso de identidade precisam; testes injetam fakes e um relógio manual. */
export interface IdentityDeps {
  readonly db: Db
  readonly clock: Clock
  /** Pimenta do HMAC do OTP e dos tokens de continuação (BETTER_AUTH_SECRET). */
  readonly secret: string
  readonly config: IdentityConfig
  readonly notifications: NotificationProvider
  readonly outbox: Outbox
}

export function createIdentityDeps(overrides: Partial<IdentityDeps> = {}): IdentityDeps {
  const secret = overrides.secret ?? loadEnv().BETTER_AUTH_SECRET
  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET ausente: obrigatório para o login (veja o .env.example).')
  }
  return {
    db: overrides.db ?? getDatabase(),
    clock: overrides.clock ?? systemClock,
    secret,
    config: overrides.config ?? DEFAULT_IDENTITY_CONFIG,
    notifications: overrides.notifications ?? getNotificationProvider(),
    outbox: overrides.outbox ?? getIdentityOutbox(),
  }
}
