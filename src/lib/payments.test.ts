import { describe, expect, it } from "vitest";
import { entryPaymentBadge, paymentMethodLabel } from "./payments";
import { billingMethodLabel, canChangeCard, nextChargeDate, subscriptionStatusLabel } from "./club-billing";

describe("rótulos de pagamento", () => {
  it("forma de pagamento com nome único", () => {
    expect(paymentMethodLabel("pix_balcao")).toBe("Pix no balcão");
    expect(paymentMethodLabel("cartao")).toBe("Cartão no balcão");
    expect(paymentMethodLabel("PIX")).toBe("Pix online");
    expect(paymentMethodLabel(null)).toBe("Outro");
  });

  it("situação do agendamento", () => {
    expect(entryPaymentBadge("local", "unpaid")).toEqual({ label: "Pagar na barbearia", variant: "muted" });
    expect(entryPaymentBadge("pix", "pending")?.variant).toBe("warning");
    expect(entryPaymentBadge("pix", "paid")?.label).toBe("Pago via Pix");
    expect(entryPaymentBadge("subscription", null)?.label).toBe("Clube");
  });

  it("forma de cobrança e status da assinatura", () => {
    expect(billingMethodLabel("CARD", { brand: "VISA", lastFour: "4242" })).toBe("Cartão •••• 4242");
    expect(billingMethodLabel("PIX")).toBe("Pix");
    expect(billingMethodLabel("MANUAL")).toBe("Balcão");
    expect(subscriptionStatusLabel("past_due")).toBe("Pagamento pendente");
    expect(subscriptionStatusLabel("active", true)).toMatch(/Cancelada/);
  });

  it("próxima cobrança e janela de troca de cartão", () => {
    const end = new Date("2026-12-01T13:00:00Z");
    const base = { status: "active" as const, paymentMethod: "CARD" as const, cancelAtPeriodEnd: false, currentPeriodEnd: end, nextChargeAt: end };
    expect(nextChargeDate(base)).toEqual(end);
    expect(nextChargeDate({ ...base, cancelAtPeriodEnd: true })).toBeNull();
    expect(nextChargeDate({ ...base, paymentMethod: "MANUAL" })).toBeNull();
    expect(canChangeCard(base, new Date("2026-11-20T13:00:00Z"))).toBe(false);
    expect(canChangeCard(base, new Date("2026-11-28T14:00:00Z"))).toBe(true);
    expect(canChangeCard({ ...base, status: "past_due" }, new Date("2026-12-03T12:00:00Z"))).toBe(true);
    expect(canChangeCard({ ...base, status: "past_due" }, new Date("2026-12-04T14:00:00Z"))).toBe(false);
  });
});
