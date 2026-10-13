/**
 * Capacidades só viram `provado` depois de prova em sandbox (T38, PRD §7.6). Ramo que depende de
 * capacidade `nao_verificado` ou `nao_suportado` fica desabilitado com pendência explícita.
 */
export type CapabilityStatus = 'provado' | 'nao_suportado' | 'nao_verificado'

export const PAYMENT_CAPABILITY_KEYS = [
  'changeNextChargeDate',
  'queryApprovalInstant',
  'refundDuplicate',
  'reversalEvents',
  'changeScheduledAmount',
  'anchorDays29To31',
  'retryAfterDue',
  'payerCancellationNotice',
] as const
export type PaymentCapabilityKey = (typeof PAYMENT_CAPABILITY_KEYS)[number]
export type PaymentCapabilities = Readonly<Record<PaymentCapabilityKey, CapabilityStatus>>

export type PaymentEnvironment = 'test' | 'prod'

/** Todo id externo é qualificado por provedor + conta + ambiente (PRD §7.6, RN05). */
export interface ExternalId {
  readonly provider: string
  readonly account: string
  readonly environment: PaymentEnvironment
  readonly id: string
}

export interface RecurringPayer {
  readonly email?: string
  readonly name?: string
  readonly documentNumber?: string
}

export interface CreateRecurringInput {
  /** `external_reference` no provedor: id da assinatura local. Usado para não duplicar recorrência. */
  readonly assinaturaId: string
  readonly amountCentavos: number
  readonly startsAt: Date
  readonly payer?: RecurringPayer
  /** Cartão: token gerado no navegador (nunca número de cartão). */
  readonly cardToken?: string
  readonly idempotencyKey: string
}

export type RecurringStatus = 'pending' | 'authorized' | 'paused' | 'canceled' | 'refused'

export interface RecurringSnapshot {
  readonly ref: ExternalId
  readonly assinaturaId: string
  readonly status: RecurringStatus
  readonly amountCentavos: number
  /** Dados extras para a tela (QR/link de autorização no Pix). Nunca segredo. */
  readonly authorizationUrl?: string
}

export type PaymentStatus = 'pending' | 'approved' | 'refused' | 'reversed'

export interface PaymentSnapshot {
  readonly ref: ExternalId
  readonly status: PaymentStatus
  readonly amountCentavos: number
  readonly currency: string
  /** Instante de aprovação registrado pelo provedor (RN05: base do ciclo pago com atraso). */
  readonly approvedAt: Date | null
  readonly externalReference: string | null
}

export interface RefundResult {
  readonly refundId: string
  readonly status: 'processing' | 'completed' | 'failed'
}

/**
 * Port de pagamento recorrente (T10 cartão, T11 Pix). Toda operação passa por `runExternalOperation` (T03).
 * Operações que dependem de capacidade não provada lançam `DEPENDENCY.UNAVAILABLE` no adapter.
 */
export interface PaymentProvider {
  readonly id: string
  readonly capabilities: PaymentCapabilities
  createRecurring(input: CreateRecurringInput): Promise<RecurringSnapshot>
  getRecurring(ref: ExternalId): Promise<RecurringSnapshot | null>
  findRecurringByReference(assinaturaId: string): Promise<RecurringSnapshot | null>
  cancelRecurring(ref: ExternalId): Promise<RecurringSnapshot>
  changeAmount(ref: ExternalId, amountCentavos: number): Promise<RecurringSnapshot>
  /** Só com `capabilities.changeNextChargeDate === 'provado'`. */
  changeNextChargeDate?(ref: ExternalId, nextChargeAt: Date): Promise<RecurringSnapshot>
  getPayment(ref: ExternalId): Promise<PaymentSnapshot | null>
  refund(ref: ExternalId, idempotencyKey: string): Promise<RefundResult>
}
