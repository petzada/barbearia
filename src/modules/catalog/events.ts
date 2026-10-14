import { defineEvent } from '~/platform/context'

export const ServicePriceChanged = defineEvent<
  'ServicePriceChanged',
  { servicoId: string; precoAnteriorCentavos: number; precoCentavos: number }
>('ServicePriceChanged', 1)

export const ServiceDurationChanged = defineEvent<
  'ServiceDurationChanged',
  { servicoId: string; duracaoAnteriorMinutos: number; duracaoMinutos: number }
>('ServiceDurationChanged', 1)

export const EnablementChanged = defineEvent<
  'EnablementChanged',
  { barbeiroId: string; servicoId: string; habilitado: boolean }
>('EnablementChanged', 1)

export const CommissionRateScheduled = defineEvent<
  'CommissionRateScheduled',
  {
    barbeiroId: string
    servicoId: string
    percentualAvulsoBp: number
    percentualAssinanteBp: number
    inicio: string
  }
>('CommissionRateScheduled', 1)
