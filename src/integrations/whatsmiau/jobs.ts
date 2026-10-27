import { getDatabase } from '~/platform/db/runtime'
import { drizzleOutbox } from '~/platform/outbox'
import { registerInboxHandler } from '~/platform/inbox'
import { DrizzleDeliveryStore } from './deliveries'
import { InboundWhatsAppMessage } from './events'
import {
  WHATSMAIU_INBOX_PROVIDER,
  parseDeliveryUpdate,
  parseInboundMessage,
  parseWhatsMiauEnvelope,
} from './webhook'
import { getWhatsMiauSendOperation } from './operations'

let inboxHandlerRegistered = false

function registerWhatsMiauJobs(): void {
  // Registra o tipo para que o handler genérico external-ops.advance consiga executar/reconciliar.
  getWhatsMiauSendOperation()
  if (inboxHandlerRegistered) return
  registerInboxHandler(WHATSMAIU_INBOX_PROVIDER, async (record, ctx) => {
    const envelope = parseWhatsMiauEnvelope(record.body)
    if (envelope.event === 'messages.update') {
      const update = parseDeliveryUpdate(record.body)
      if (update && ['DELIVERY_ACK', 'READ'].includes(update.status)) {
        await new DrizzleDeliveryStore().confirmByExternalId(
          ctx,
          update.instance,
          update.externalId,
        )
      }
      return
    }

    const mensagem = parseInboundMessage(record.body)
    if (!mensagem) return
    const definedEvent = InboundWhatsAppMessage.create(ctx, {
      aggregateId: record.id,
      aggregateRevision: 1,
      payload: mensagem,
    })
    // D0010: uma linha da inbox representa a mensagem; o ID estável impede evento duplicado em retry.
    await getDatabase().transaction((tx) =>
      drizzleOutbox.publishInTx(tx, { ...definedEvent, id: record.id }),
    )
  })
  inboxHandlerRegistered = true
}

// T11 carrega este módulo no boot; o import registra as filas e o handler da integração.
registerWhatsMiauJobs()
