import { defineEvent } from '~/platform/context'

export interface InboundWhatsAppMessagePayload {
  readonly telefoneE164: string
  readonly texto: string
  readonly textoNormalizado: string
  readonly recebidoEm: Date
  readonly instancia: string
}

export const InboundWhatsAppMessage = defineEvent<
  'InboundWhatsAppMessage',
  InboundWhatsAppMessagePayload
>('InboundWhatsAppMessage', 1)
