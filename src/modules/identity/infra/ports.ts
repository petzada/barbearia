import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type {
  NotificationMessage,
  NotificationOutcome,
  NotificationProvider,
} from '~/contracts/ports/notification-provider'
import type { Outbox } from '~/contracts/ports/outbox'
import { FakeOutbox } from '~/contracts/fakes/outbox'
import { logger, maskPhone } from '~/platform/logging'

// T04 não depende de T09 (adapter real do WhatsApp) nem de T03 (outbox real): consome os PORTS e quem integra
// registra as implementações. Em produção, sem implementação registrada, falha fechado.

let notificacoes: NotificationProvider | undefined
let outbox: Outbox | undefined

/** T09 (WhatsMiau) registra aqui o provedor real. Testes registram o fake. */
export function setNotificationProvider(provider: NotificationProvider | undefined): void {
  notificacoes = provider
}

/** T03 registra aqui o `drizzleOutbox` (publicação na transação). */
export function setIdentityOutbox(valor: Outbox | undefined): void {
  outbox = valor
}

/**
 * Provedor de desenvolvimento: NUNCA em produção. Grava a mensagem (com o código) num arquivo local para o
 * desenvolvedor e o e2e lerem; o log só leva telefone mascarado e o código nunca (PRD §7.8).
 */
export class DevFileNotificationProvider implements NotificationProvider {
  constructor(private readonly arquivo: string) {}

  send(message: NotificationMessage): Promise<NotificationOutcome> {
    mkdirSync(dirname(this.arquivo), { recursive: true })
    appendFileSync(this.arquivo, `${JSON.stringify({ ...message, enviadoEm: new Date().toISOString() })}\n`)
    logger.info({ canal: message.channel, para: maskPhone(message.toE164) }, 'mensagem de desenvolvimento gravada')
    return Promise.resolve({ status: 'sent', externalId: `dev-${message.idempotencyKey}` })
  }
}

export function getNotificationProvider(): NotificationProvider {
  if (notificacoes) return notificacoes
  if (process.env['NODE_ENV'] !== 'production') {
    notificacoes = new DevFileNotificationProvider(
      process.env['IDENTITY_DEV_OTP_FILE'] ?? '.dev/mensagens.jsonl',
    )
    return notificacoes
  }
  // Falha fechada: sem provedor, o envio devolve falha transitória e o usuário recebe a mensagem honesta.
  return {
    send: () =>
      Promise.resolve({ status: 'permanent_failure', reason: 'nenhum provedor de notificação registrado' }),
  }
}

export function getIdentityOutbox(): Outbox {
  if (outbox) return outbox
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('Outbox não registrado: T03 deve chamar setIdentityOutbox no boot.')
  }
  logger.warn('outbox de desenvolvimento em memória: eventos de identidade não serão entregues')
  outbox = new FakeOutbox()
  return outbox
}
