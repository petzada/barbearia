import {
  PAYMENT_CAPABILITY_KEYS,
  type CreateRecurringInput,
  type ExternalId,
  type PaymentCapabilities,
  type PaymentProvider,
  type PaymentSnapshot,
  type RecurringSnapshot,
  type RefundResult,
} from '../ports/payment-provider'

const SEM_PROVA: PaymentCapabilities = Object.fromEntries(
  PAYMENT_CAPABILITY_KEYS.map((chave) => [chave, 'nao_verificado' as const]),
) as PaymentCapabilities

/**
 * Fake em memória do `PaymentProvider`: cria recorrência uma única vez por `assinaturaId`
 * (como a busca por `external_reference` do PRD §7.6) e devolve em dobro a mesma devolução por chave.
 * Os adapters reais devem passar na mesma suíte de contrato (T10/T11).
 */
export class FakePaymentProvider implements PaymentProvider {
  readonly id = 'fake'
  readonly recurrings = new Map<string, RecurringSnapshot>()
  readonly payments = new Map<string, PaymentSnapshot>()
  private readonly refunds = new Map<string, RefundResult>()
  private sequence = 0

  constructor(readonly capabilities: PaymentCapabilities = SEM_PROVA) {}

  createRecurring(input: CreateRecurringInput): Promise<RecurringSnapshot> {
    const existente = [...this.recurrings.values()].find(
      (r) => r.assinaturaId === input.assinaturaId,
    )
    if (existente) return Promise.resolve(existente)
    this.sequence += 1
    const snapshot: RecurringSnapshot = {
      ref: this.refOf(`rec-${this.sequence}`),
      assinaturaId: input.assinaturaId,
      status: 'authorized',
      amountCentavos: input.amountCentavos,
    }
    this.recurrings.set(snapshot.ref.id, snapshot)
    return Promise.resolve(snapshot)
  }

  getRecurring(ref: ExternalId): Promise<RecurringSnapshot | null> {
    return Promise.resolve(this.recurrings.get(ref.id) ?? null)
  }

  findRecurringByReference(assinaturaId: string): Promise<RecurringSnapshot | null> {
    const achada = [...this.recurrings.values()].find((r) => r.assinaturaId === assinaturaId)
    return Promise.resolve(achada ?? null)
  }

  cancelRecurring(ref: ExternalId): Promise<RecurringSnapshot> {
    return this.update(ref, { status: 'canceled' })
  }

  changeAmount(ref: ExternalId, amountCentavos: number): Promise<RecurringSnapshot> {
    return this.update(ref, { amountCentavos })
  }

  getPayment(ref: ExternalId): Promise<PaymentSnapshot | null> {
    return Promise.resolve(this.payments.get(ref.id) ?? null)
  }

  refund(ref: ExternalId, idempotencyKey: string): Promise<RefundResult> {
    const anterior = this.refunds.get(`${ref.id}:${idempotencyKey}`)
    if (anterior) return Promise.resolve(anterior)
    this.sequence += 1
    const resultado: RefundResult = { refundId: `ref-${this.sequence}`, status: 'completed' }
    this.refunds.set(`${ref.id}:${idempotencyKey}`, resultado)
    return Promise.resolve(resultado)
  }

  private refOf(id: string): ExternalId {
    return { provider: this.id, account: 'fake-account', environment: 'test', id }
  }

  private update(ref: ExternalId, patch: Partial<RecurringSnapshot>): Promise<RecurringSnapshot> {
    const atual = this.recurrings.get(ref.id)
    if (!atual) return Promise.reject(new Error(`recorrência ${ref.id} não existe no fake`))
    const novo = { ...atual, ...patch }
    this.recurrings.set(ref.id, novo)
    return Promise.resolve(novo)
  }
}
