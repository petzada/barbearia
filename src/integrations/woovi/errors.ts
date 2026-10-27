import { defineErrors } from '~/platform/errors'

export const WooviErrors = defineErrors('WOOVI', {
  PAYER_ADDRESS_REQUIRED: {
    httpStatus: 422,
    message: 'Informe o endereço do pagador para criar a autorização Pix Automático.',
  },
  SUBACCOUNT_REQUIRED: {
    httpStatus: 503,
    message: 'Configure a subconta Woovi antes de criar uma cobrança Pix.',
  },
  IMMEDIATE_CHARGE_DISABLED: {
    httpStatus: 503,
    message: 'A cobrança Pix imediata está desativada até a validação de H01/T38.',
  },
})
