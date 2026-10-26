import { vi } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { whatsappConfig } from "@/server/db/schema";
import {
  AbacatePayError,
  type CardCharge,
  type CardStatus,
  type PaymentGateway,
  type PixStatus,
} from "@/server/payments/abacatepay";
import type { WhatsappGateway } from "@/server/whatsapp/service";

/**
 * Resultado da próxima cobrança no cartão:
 * - status do AbacatePay (APPROVED, PENDING, FAILED…);
 * - REFUSE: recusa (4xx);
 * - TIMEOUT: a cobrança É criada no AbacatePay, mas a resposta se perde;
 * - NETWORK: falha antes de chegar ao AbacatePay (nada criado).
 */
export type CardOutcome = CardStatus | "REFUSE" | "TIMEOUT" | "NETWORK";

/** AbacatePay em memória: Pix e cartão com estado controlável pelos testes. */
export function fakePaymentGateway(now: () => Date = () => new Date()) {
  let seq = 0;
  const pix = new Map<string, PixStatus>();
  const cards = new Map<string, CardCharge>();
  const queue: CardOutcome[] = [];
  let defaultOutcome: CardOutcome = "APPROVED";

  const gw = {
    createPixCharge: vi.fn(async (input: Parameters<PaymentGateway["createPixCharge"]>[0]) => {
      const id = `pix_char_${++seq}`;
      pix.set(id, "PENDING");
      return {
        id,
        amount: input.amountCents,
        status: "PENDING" as PixStatus,
        devMode: true,
        brCode: `00020101021226-${id}`,
        brCodeBase64: "data:image/png;base64,AAA",
        expiresAt: new Date(now().getTime() + input.expiresInSeconds * 1000).toISOString(),
      };
    }),
    checkPixCharge: vi.fn(async (id: string) => ({ id, status: pix.get(id) ?? "PENDING", expiresAt: null })),
    simulatePixPayment: vi.fn(async (id: string) => {
      pix.set(id, "PAID");
    }),
    createCardCharge: vi.fn(async (input: Parameters<PaymentGateway["createCardCharge"]>[0]) => {
      const outcome = queue.shift() ?? defaultOutcome;
      if (outcome === "REFUSE") throw new AbacatePayError("Card declined", 402);
      if (outcome === "NETWORK") throw new TypeError("fetch failed");
      const id = `card_${++seq}`;
      const charge: CardCharge = {
        id,
        amount: input.amountCents,
        status: outcome === "TIMEOUT" ? "APPROVED" : outcome,
        devMode: true,
        cardToken: input.token ? `card_tok_${seq}` : (input.cardToken ?? null),
        brand: "VISA",
        lastFour: input.token ? "4242" : "1111",
        metadata: input.metadata,
      };
      cards.set(id, charge);
      if (outcome === "TIMEOUT") throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
      return { ...charge };
    }),
    getCardCharge: vi.fn(async (id: string) => {
      const charge = cards.get(id);
      if (!charge) throw new AbacatePayError("Not found", 404);
      return { ...charge };
    }),
    listCardCharges: vi.fn(async () => [...cards.values()].map((c) => ({ ...c }))),
    refund: vi.fn(async (id: string) => {
      const card = cards.get(id);
      if (card) card.status = "REFUNDED";
      if (pix.has(id)) pix.set(id, "REFUNDED");
    }),
  } satisfies PaymentGateway;

  return {
    gw,
    pix,
    cards,
    /** Próximas cobranças no cartão, em ordem; depois volta ao padrão. */
    queueCard: (...outcomes: CardOutcome[]) => queue.push(...outcomes),
    setDefaultCard: (outcome: CardOutcome) => (defaultOutcome = outcome),
    setPix: (id: string, status: PixStatus) => pix.set(id, status),
    setCard: (id: string, status: CardStatus) => {
      cards.get(id)!.status = status;
    },
    lastPixId: () => [...pix.keys()].at(-1)!,
    lastCardId: () => [...cards.keys()].at(-1)!,
  };
}

/** WhatsApp conectado com envio registrado. */
export async function fakeWhatsapp(db: Db) {
  await db.update(whatsappConfig).set({ instanceId: "inst-1", status: "connected" }).where(eq(whatsappConfig.id, 1));
  const sendText = vi.fn(async (_instance: string, _to: string, _text: string) => ({}));
  const gateway = {
    sendText,
    createInstance: vi.fn(),
    connectInstance: vi.fn(),
    deleteInstance: vi.fn(),
    listInstances: vi.fn(async () => []),
  } as unknown as WhatsappGateway;
  return { gateway, sendText };
}
