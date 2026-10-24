import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/test/d1";
import { createAdmin, createBarber, createUser, sp } from "@/test/factories";
import { payments, plans, scheduleEntries, subscriptions, webhookEvents } from "../db/schema";
import { createAppointment } from "../scheduling";
import type { PaymentGateway, PixStatus } from "./abacatepay";
import {
  addCycle,
  cancelSubscription,
  getActiveSubscription,
  grantManualSubscription,
  handleAbacateWebhook,
  refreshPixPayment,
  simulatePixPayment,
  startAppointmentPix,
  startSubscriptionCheckout,
  upsertPlan,
} from "./service";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
beforeEach(() => t.reset());
afterAll(() => t.dispose());

const NOW = sp("2026-11-01", "10:00");

function fakeGateway() {
  let pixStatus: PixStatus = "PENDING";
  let subStatus: "PENDING" | "ACTIVE" | "CANCELLED" = "ACTIVE";
  const gw = {
    createPixCharge: vi.fn(async (input: { amountCents: number }) => ({
      id: "pix_char_123",
      amount: input.amountCents,
      status: "PENDING" as PixStatus,
      devMode: true,
      brCode: "00020101021226...",
      brCodeBase64: "data:image/png;base64,AAA",
      expiresAt: new Date(NOW.getTime() + 30 * 60_000).toISOString(),
    })),
    checkPixCharge: vi.fn(async (id: string) => ({ id, status: pixStatus, expiresAt: null })),
    simulatePixPayment: vi.fn(async () => {
      pixStatus = "PAID";
    }),
    createProduct: vi.fn(async () => ({ id: "prod_1", externalId: "x", name: "x", price: 9900 })),
    createSubscriptionCheckout: vi.fn(async () => ({
      id: "bill_abc", url: "https://app.abacatepay.com/pay/bill_abc", status: "PENDING", devMode: true,
    })),
    getSubscription: vi.fn(async (id: string) => ({
      id, checkoutId: "bill_abc", status: subStatus, method: "CARD" as const, amount: 9900, devMode: true,
    })),
    cancelSubscription: vi.fn(async () => {}),
  } satisfies PaymentGateway;
  return {
    gw,
    setPix: (s: PixStatus) => (pixStatus = s),
    setSub: (s: typeof subStatus) => (subStatus = s),
  };
}

async function bookedPixAppointment() {
  const barber = await createBarber(t.db);
  const client = await createUser(t.db);
  const entry = await createAppointment(
    t.db, client,
    { barberId: barber.id, serviceId: "svc-corte", startsAt: sp("2026-11-02", "10:00").getTime(), paymentChoice: "pix" },
    NOW,
  );
  return { barber, client, entry };
}

async function createPlan() {
  const admin = await createAdmin(t.db);
  const plan = await upsertPlan(t.db, admin, {
    slug: "mensal", name: "Mensal", priceCents: 9900, cycle: "MONTHLY",
    benefits: ["Benefício A"], active: true, sortOrder: 0,
  });
  return { admin, plan };
}

describe("Pix avulso do agendamento", () => {
  it("gera QR dinâmico com o valor de tabela e reaproveita o pendente", async () => {
    const { client, entry } = await bookedPixAppointment();
    const { gw } = fakeGateway();
    const payment = await startAppointmentPix(t.db, client, gw, entry.id, NOW);
    expect(payment).toMatchObject({ amountCents: 4500, status: "pending", providerId: "pix_char_123", devMode: true });
    expect(gw.createPixCharge).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 4500, externalId: payment.id }));

    const again = await startAppointmentPix(t.db, client, gw, entry.id, NOW);
    expect(again.id).toBe(payment.id);
    expect(gw.createPixCharge).toHaveBeenCalledTimes(1);
  });

  it("outro cliente não gera Pix do agendamento alheio", async () => {
    const { entry } = await bookedPixAppointment();
    const intruder = await createUser(t.db);
    await expect(startAppointmentPix(t.db, intruder, fakeGateway().gw, entry.id, NOW)).rejects.toMatchObject({ code: "not_found" });
  });

  it("polling marca pago; expirado volta para pagamento na barbearia", async () => {
    const { client, entry } = await bookedPixAppointment();
    const { gw, setPix } = fakeGateway();
    const payment = await startAppointmentPix(t.db, client, gw, entry.id, NOW);

    expect((await refreshPixPayment(t.db, gw, payment.id, { actor: client })).status).toBe("pending");
    setPix("EXPIRED");
    expect((await refreshPixPayment(t.db, gw, payment.id, { actor: client })).status).toBe("expired");
    const [row] = await t.db.select().from(scheduleEntries);
    expect(row).toMatchObject({ status: "booked", paymentMethod: "local", paymentStatus: "unpaid" });
  });

  it("simulação no modo de teste confirma o pagamento", async () => {
    const { client, entry } = await bookedPixAppointment();
    const { gw } = fakeGateway();
    const payment = await startAppointmentPix(t.db, client, gw, entry.id, NOW);
    const paid = await simulatePixPayment(t.db, client, gw, payment.id);
    expect(paid.status).toBe("paid");
    const [row] = await t.db.select().from(scheduleEntries);
    expect(row.paymentStatus).toBe("paid");
  });

  it("webhook transparent.completed confere no AbacatePay antes de marcar pago e é idempotente", async () => {
    const { client, entry } = await bookedPixAppointment();
    const { gw, setPix } = fakeGateway();
    await startAppointmentPix(t.db, client, gw, entry.id, NOW);
    const event = { id: "log_1", event: "transparent.completed", data: { transparent: { id: "pix_char_123" } } };

    // Payload diz pago, mas a API ainda diz PENDING: não marca.
    await handleAbacateWebhook(t.db, gw, { ...event, id: "log_0" }, NOW);
    expect((await t.db.select().from(payments))[0].status).toBe("pending");

    setPix("PAID");
    expect(await handleAbacateWebhook(t.db, gw, event, NOW)).toBe("processed");
    expect(await handleAbacateWebhook(t.db, gw, event, NOW)).toBe("duplicate");
    expect((await t.db.select().from(payments))[0].status).toBe("paid");
    expect(await t.db.select().from(webhookEvents)).toHaveLength(2);
  });
});

describe("assinaturas", () => {
  it("checkout cria produto recorrente uma vez e assinatura pendente", async () => {
    const { plan } = await createPlan();
    const client = await createUser(t.db);
    const { gw } = fakeGateway();
    const { url } = await startSubscriptionCheckout(t.db, client, gw, { appBaseUrl: "https://app" }, plan.id, NOW);
    expect(url).toContain("bill_abc");
    expect(gw.createProduct).toHaveBeenCalledWith(expect.objectContaining({ priceCents: 9900, cycle: "MONTHLY" }));
    const [sub] = await t.db.select().from(subscriptions);
    expect(sub).toMatchObject({ status: "pending", providerCheckoutId: "bill_abc" });
    const [p] = await t.db.select().from(plans);
    expect(p.providerProductId).toBe("prod_1");
  });

  it("subscription.completed ativa, renewed estende e cancelled encerra", async () => {
    const { plan } = await createPlan();
    const client = await createUser(t.db);
    const { gw } = fakeGateway();
    await startSubscriptionCheckout(t.db, client, gw, { appBaseUrl: "https://app" }, plan.id, NOW);

    const data = { subscription: { id: "subs_1", checkoutId: "bill_abc" } };
    await handleAbacateWebhook(t.db, gw, { id: "e1", event: "subscription.completed", data }, NOW);
    let active = await getActiveSubscription(t.db, client.id, NOW);
    expect(active?.currentPeriodEnd?.toISOString()).toBe(addCycle(NOW, "MONTHLY").toISOString());
    expect(active?.providerSubscriptionId).toBe("subs_1");

    await handleAbacateWebhook(t.db, gw, { id: "e2", event: "subscription.renewed", data }, NOW);
    active = await getActiveSubscription(t.db, client.id, NOW);
    expect(active?.currentPeriodEnd?.toISOString()).toBe(addCycle(addCycle(NOW, "MONTHLY"), "MONTHLY").toISOString());
    const subPayments = await t.db.select().from(payments).where(eq(payments.kind, "subscription"));
    expect(subPayments).toHaveLength(2);

    await handleAbacateWebhook(t.db, gw, { id: "e3", event: "subscription.cancelled", data }, NOW);
    expect(await getActiveSubscription(t.db, client.id, NOW)).toBeNull();
  });

  it("não ativa se o AbacatePay não confirmar a assinatura", async () => {
    const { plan } = await createPlan();
    const client = await createUser(t.db);
    const { gw, setSub } = fakeGateway();
    await startSubscriptionCheckout(t.db, client, gw, { appBaseUrl: "https://app" }, plan.id, NOW);
    setSub("PENDING");
    await handleAbacateWebhook(t.db, gw, { id: "e1", event: "subscription.completed", data: { subscription: { id: "subs_1", checkoutId: "bill_abc" } } }, NOW);
    expect(await getActiveSubscription(t.db, client.id, NOW)).toBeNull();
  });

  it("bloqueia segunda assinatura ativa e cliente cancela a própria", async () => {
    const { plan } = await createPlan();
    const client = await createUser(t.db);
    const { gw } = fakeGateway();
    await startSubscriptionCheckout(t.db, client, gw, { appBaseUrl: "https://app" }, plan.id, NOW);
    await handleAbacateWebhook(t.db, gw, { id: "e1", event: "subscription.completed", data: { subscription: { id: "subs_1", checkoutId: "bill_abc" } } }, NOW);
    await expect(
      startSubscriptionCheckout(t.db, client, gw, { appBaseUrl: "https://app" }, plan.id, NOW),
    ).rejects.toThrow(/já tem uma assinatura/);

    const active = (await getActiveSubscription(t.db, client.id, NOW))!;
    const stranger = await createUser(t.db);
    await expect(cancelSubscription(t.db, stranger, gw, active.id, NOW)).rejects.toMatchObject({ code: "not_found" });
    await cancelSubscription(t.db, client, gw, active.id, NOW);
    expect(gw.cancelSubscription).toHaveBeenCalledWith("subs_1");
    expect(await getActiveSubscription(t.db, client.id, NOW)).toBeNull();
  });

  it("admin registra assinatura paga no balcão e renova somando ciclo", async () => {
    const { admin, plan } = await createPlan();
    const client = await createUser(t.db);
    const barber = await createBarber(t.db);
    await expect(
      grantManualSubscription(t.db, barber, { userId: client.id, planId: plan.id, method: "dinheiro" }, NOW),
    ).rejects.toMatchObject({ code: "forbidden" });
    const sub = await grantManualSubscription(t.db, admin, { userId: client.id, planId: plan.id, method: "dinheiro" }, NOW);
    expect(sub).toMatchObject({ status: "active", provider: "manual" });
    const renewed = await grantManualSubscription(t.db, admin, { userId: client.id, planId: plan.id, method: "pix_balcao" }, NOW);
    expect(renewed.id).toBe(sub.id);
    expect(renewed.currentPeriodEnd?.toISOString()).toBe(addCycle(addCycle(NOW, "MONTHLY"), "MONTHLY").toISOString());
  });

  it("alterar preço do plano exige novo produto no AbacatePay", async () => {
    const { admin, plan } = await createPlan();
    await t.db.update(plans).set({ providerProductId: "prod_old" }).where(eq(plans.id, plan.id));
    const updated = await upsertPlan(t.db, admin, {
      id: plan.id, slug: "mensal", name: "Mensal", priceCents: 10900, cycle: "MONTHLY",
      benefits: [], active: true, sortOrder: 0,
    });
    expect(updated.providerProductId).toBeNull();
  });
});

describe("addCycle", () => {
  it("soma ciclos no calendário", () => {
    const base = new Date("2026-01-31T12:00:00Z");
    expect(addCycle(base, "WEEKLY").toISOString()).toBe("2026-02-07T12:00:00.000Z");
    expect(addCycle(base, "ANNUALLY").toISOString()).toBe("2027-01-31T12:00:00.000Z");
    expect(addCycle(new Date("2026-03-15T00:00:00Z"), "QUARTERLY").toISOString()).toBe("2026-06-15T00:00:00.000Z");
  });
});
