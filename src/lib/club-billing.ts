/**
 * Regras de cobrança do Clube (servidor e telas usam as mesmas constantes).
 *
 * - Cartão: cobrado no fim do ciclo; recusou → "pagamento pendente", nova
 *   tentativa a cada 24h (3 no total) e acesso mantido por 3 dias de carência.
 * - Pix: o Pix da renovação é gerado e enviado no WhatsApp 3 dias antes do fim;
 *   sem pagamento, o acesso segue até 3 dias depois do fim.
 * - Cancelar: sem novas cobranças; o acesso vale até o fim do período pago.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;
export const BILLING_GRACE_DAYS = 3;
export const BILLING_GRACE_MS = BILLING_GRACE_DAYS * DAY_MS;
export const PIX_RENEWAL_LEAD_MS = 3 * DAY_MS;
export const CARD_RETRY_MS = DAY_MS;
export const MAX_CARD_ATTEMPTS = 3;
/** Trocar o cartão só quando falta pouco para a renovação (ou se ela falhou). */
export const CHANGE_CARD_WINDOW_MS = 3 * DAY_MS;

export type ClubBillingMethod = "CARD" | "PIX" | "MANUAL";
export type ClubSubscriptionStatus = "pending" | "active" | "past_due" | "cancelled" | "expired";

export function graceEndOf(periodEnd: Date): Date {
  return new Date(periodEnd.getTime() + BILLING_GRACE_MS);
}

/** "Cartão •••• 4242", "Pix", "Balcão". */
export function billingMethodLabel(
  method: ClubBillingMethod | null | undefined,
  card?: { brand?: string | null; lastFour?: string | null } | null,
): string {
  if (method === "CARD") {
    return card?.lastFour ? `Cartão •••• ${card.lastFour}` : "Cartão";
  }
  if (method === "PIX") return "Pix";
  return "Balcão";
}

export function subscriptionStatusLabel(status: ClubSubscriptionStatus, cancelAtPeriodEnd = false): string {
  if (status === "active" && cancelAtPeriodEnd) return "Cancelada · vale até o fim do período";
  switch (status) {
    case "active":
      return "Ativa";
    case "past_due":
      return "Pagamento pendente";
    case "pending":
      return "Aguardando pagamento";
    case "cancelled":
      return "Cancelada";
    case "expired":
      return "Encerrada";
  }
}

type BillingSnapshot = {
  status: ClubSubscriptionStatus;
  paymentMethod: ClubBillingMethod | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  nextChargeAt: Date | null;
};

/** Próxima cobrança mostrada ao cliente/gestão (`null` = não haverá). */
export function nextChargeDate(sub: BillingSnapshot): Date | null {
  if (sub.cancelAtPeriodEnd || !sub.currentPeriodEnd) return null;
  if (sub.status !== "active" && sub.status !== "past_due") return null;
  if (sub.paymentMethod === "CARD") return sub.status === "past_due" ? sub.nextChargeAt : sub.currentPeriodEnd;
  if (sub.paymentMethod === "PIX") return sub.currentPeriodEnd;
  return null;
}

/** Pode trocar o cartão: pagamento pendente ou até 3 dias antes da renovação. */
export function canChangeCard(sub: BillingSnapshot, now: Date = new Date()): boolean {
  if (!sub.currentPeriodEnd) return false;
  if (sub.status === "past_due") return now < graceEndOf(sub.currentPeriodEnd);
  if (sub.status !== "active" || sub.paymentMethod === "MANUAL") return false;
  return sub.currentPeriodEnd.getTime() - now.getTime() <= CHANGE_CARD_WINDOW_MS;
}
