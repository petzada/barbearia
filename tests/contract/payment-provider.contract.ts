import { describe, expect, it } from 'vitest'
import type { ExternalId, PaymentProvider } from '~/contracts'
import type { CreateRecurringInput } from '~/contracts/ports/payment-provider'

export interface PaymentProviderContractSubject {
  readonly provider: PaymentProvider
  readonly paymentRef: ExternalId
}

export function paymentProviderContract(
  name: string,
  makeSubject: () => PaymentProviderContractSubject,
): void {
  describe(`contrato PaymentProvider: ${name}`, () => {
    const input: CreateRecurringInput = {
      assinaturaId: 'assinatura-contract-01',
      amountCentavos: 2500,
      startsAt: new Date('2030-01-15T12:00:00.000Z'),
      payer: {
        name: 'Pessoa de teste',
        email: 'teste@example.test',
        documentNumber: '00000000000',
        address: {
          cep: '01001000',
          rua: 'Rua de teste',
          numero: '10',
          bairro: 'Centro',
          cidade: 'São Paulo',
          uf: 'SP',
        },
      },
      idempotencyKey: 'contract-create-01',
    }

    it('cria uma recorrência idempotente e permite buscá-la por referência', async () => {
      const { provider } = makeSubject()
      const primeira = await provider.createRecurring(input)
      const segunda = await provider.createRecurring({
        ...input,
        idempotencyKey: 'contract-create-02',
      })
      expect(segunda.ref).toEqual(primeira.ref)
      expect(segunda.assinaturaId).toBe(input.assinaturaId)
      expect(segunda.amountCentavos).toBe(input.amountCentavos)
      expect(await provider.getRecurring(primeira.ref)).toEqual(primeira)
      expect(await provider.findRecurringByReference(input.assinaturaId)).toEqual(primeira)
    })

    it('cancela e altera o valor da recorrência', async () => {
      const { provider } = makeSubject()
      const criada = await provider.createRecurring(input)
      const alterada = await provider.changeAmount(criada.ref, 2700)
      expect(alterada.amountCentavos).toBe(2700)
      const cancelada = await provider.cancelRecurring(criada.ref)
      expect(cancelada.status).toBe('canceled')
    })

    it('consulta pagamentos ausentes e devolve com chave idempotente', async () => {
      const { provider, paymentRef } = makeSubject()
      const pagamento = await provider.getPayment(paymentRef)
      expect(pagamento).toMatchObject({
        ref: paymentRef,
        status: 'approved',
        amountCentavos: 2500,
        currency: 'BRL',
        externalReference: 'E0000000000000000000000000000000',
      })
      expect(pagamento?.approvedAt?.toISOString()).toBe('2026-10-12T18:30:00.000Z')
      const ausente = await provider.getPayment({ ...paymentRef, id: 'missing-payment' })
      expect(ausente).toBeNull()

      const primeira = await provider.refund(paymentRef, 'refund-contract-01')
      const segunda = await provider.refund(paymentRef, 'refund-contract-01')
      expect(segunda).toEqual(primeira)
      expect(primeira.status).toBe('completed')
    })
  })
}
