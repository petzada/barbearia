import type { EntryPaymentMethod, EntryPaymentStatus } from "@/server/db/schema";

/**
 * Dicionário único de rótulos de pagamento — usado por cliente, barbeiro,
 * financeiro, clube e CSV. Não escreva esses textos à mão nas telas.
 */

/** Forma de pagamento registrada (online pelo AbacatePay ou no balcão). */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: "Pix online",
  CARD: "Cartão online",
  dinheiro: "Dinheiro",
  cartao: "Cartão no balcão",
  pix_balcao: "Pix no balcão",
};

export const paymentMethodLabel = (method: string | null | undefined): string =>
  (method && PAYMENT_METHOD_LABELS[method]) || "Outro";

/** Rótulo curto dos botões de "Recebeu no balcão?" (o contexto já diz balcão). */
export const LOCAL_PAYMENT_SHORT_LABELS = {
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  pix_balcao: "Pix",
} as const;

/** Canais de recebimento (filtros do financeiro). */
export const PAYMENT_CHANNEL_LABELS = {
  online: "Online",
  balcao: "No balcão",
} as const;

/** Como o cliente escolheu pagar o agendamento. */
export const PAY_AT_SHOP_LABEL = "Pagar na barbearia";

/** Origem da assinatura do clube. */
export function subscriptionPaymentLabel(provider: "abacatepay" | "manual", method: string | null): string {
  if (provider === "manual") return "Pago no balcão";
  return method === "PIX" ? "Pix automático" : "Cartão automático";
}

export type PaymentBadge = { label: string; variant: "soft" | "success" | "warning" | "muted" };

/** Situação do pagamento de um agendamento. */
export function entryPaymentBadge(
  method: EntryPaymentMethod | null,
  status: EntryPaymentStatus | null,
): PaymentBadge | null {
  if (status === "paid") return { label: method === "pix" ? "Pago via Pix" : "Pago", variant: "success" };
  if (method === "subscription") return { label: "Clube", variant: "soft" };
  if (status === "pending") return { label: "Pix pendente", variant: "warning" };
  if (method === "local" || status === "unpaid") return { label: PAY_AT_SHOP_LABEL, variant: "muted" };
  return null;
}
