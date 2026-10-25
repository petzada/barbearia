import { describe, expect, it } from "vitest";
import { entryPaymentBadge, paymentMethodLabel, subscriptionPaymentLabel } from "./payments";

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

  it("origem da assinatura", () => {
    expect(subscriptionPaymentLabel("manual", "dinheiro")).toBe("Pago no balcão");
    expect(subscriptionPaymentLabel("abacatepay", "PIX")).toBe("Pix automático");
  });
});
