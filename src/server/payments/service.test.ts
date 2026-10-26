import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/test/d1";
import { createAdmin, createBarber, createUser, sp } from "@/test/factories";
import { payments, plans, scheduleEntries, subscriptions, webhookEvents } from "../db/schema";
import { createAppointment } from "../scheduling";
import type { PixStatus } from "./abacatepay";
import {
  addCycle,
  grantManualSubscription,
  handleAbacateWebhook,
  refreshPixPayment,
  simulatePixPayment,
  startAppointmentPix,
  upsertPlan,
} from "./service";
import { fakePaymentGateway } from "@/test/fake-payments";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
beforeEach(() => t.reset());
afterAll(() => t.dispose());

const NOW = sp("2026-11-01", "10:00");

function fakeGateway() {
  const fake = fakePaymentGateway(() => NOW);
  return { ...fake, deps: { gateway: fake.gw }, setPix: (status: PixStatus) => fake.setPix(fake.lastPixId(), status) };
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

describe("Pix avulso do agendamento", () => {
  it("gera QR dinâmico com o valor de tabela e reaproveita o pendente", async () => {
    const { client, entry } = await bookedPixAppointment();
    const { gw } = fakeGateway();
    const payment = await startAppointmentPix(t.db, client, gw, entry.id, NOW);
    expect(payment).toMatchObject({ amountCents: 4500, status: "pending", providerId: "pix_char_1", devMode: true });
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
    const { gw, deps, setPix } = fakeGateway();
    const payment = await startAppointmentPix(t.db, client, gw, entry.id, NOW);

    expect((await refreshPixPayment(t.db, deps, payment.id, { actor: client })).status).toBe("pending");
    setPix("EXPIRED");
    expect((await refreshPixPayment(t.db, deps, payment.id, { actor: client })).status).toBe("expired");
    const [row] = await t.db.select().from(scheduleEntries);
    expect(row).toMatchObject({ status: "booked", paymentMethod: "local", paymentStatus: "unpaid" });
  });

  it("simulação no modo de teste confirma o pagamento", async () => {
    const { client, entry } = await bookedPixAppointment();
    const { gw, deps } = fakeGateway();
    const payment = await startAppointmentPix(t.db, client, gw, entry.id, NOW);
    const paid = await simulatePixPayment(t.db, client, deps, payment.id);
    expect(paid.status).toBe("paid");
    const [row] = await t.db.select().from(scheduleEntries);
    expect(row.paymentStatus).toBe("paid");
  });

  it("webhook transparent.completed confere no AbacatePay antes de marcar pago e é idempotente", async () => {
    const { client, entry } = await bookedPixAppointment();
    const { gw, deps, setPix } = fakeGateway();
    await startAppointmentPix(t.db, client, gw, entry.id, NOW);
    const event = { id: "log_1", event: "transparent.completed", data: { transparent: { id: "pix_char_1" } } };

    // Payload diz pago, mas a API ainda diz PENDING: não marca.
    await handleAbacateWebhook(t.db, deps, { ...event, id: "log_0" }, NOW);
    expect((await t.db.select().from(payments))[0].status).toBe("pending");

    setPix("PAID");
    expect(await handleAbacateWebhook(t.db, deps, event, NOW)).toBe("processed");
    expect(await handleAbacateWebhook(t.db, deps, event, NOW)).toBe("duplicate");
    expect((await t.db.select().from(payments))[0].status).toBe("paid");
    expect(await t.db.select().from(webhookEvents)).toHaveLength(2);
  });
});

describe("planos", () => {
  it("preço novo não muda o valor fixado das assinaturas existentes", async () => {
    const admin = await createAdmin(t.db);
    const client = await createUser(t.db);
    const plan = await upsertPlan(t.db, admin, {
      slug: "mensal", name: "Mensal", priceCents: 9900, cycle: "MONTHLY",
      benefits: ["Benefício A"], active: true, sortOrder: 0,
    });
    const sub = await grantManualSubscription(t.db, admin, { userId: client.id, planId: plan.id, method: "dinheiro" }, NOW);
    expect(sub.priceCents).toBe(9900);
    await upsertPlan(t.db, admin, {
      id: plan.id, slug: "mensal", name: "Mensal", priceCents: 10900, cycle: "MONTHLY",
      benefits: [], active: true, sortOrder: 0,
    });
    const [row] = await t.db.select().from(subscriptions).where(eq(subscriptions.id, sub.id));
    expect(row.priceCents).toBe(9900);
  });

  it("admin registra assinatura paga no balcão e renova somando ciclo", async () => {
    const admin = await createAdmin(t.db);
    const plan = (await t.db.query.plans.findFirst({ where: eq(plans.slug, "black") }))!;
    const client = await createUser(t.db);
    const barber = await createBarber(t.db);
    await expect(
      grantManualSubscription(t.db, barber, { userId: client.id, planId: plan.id, method: "dinheiro" }, NOW),
    ).rejects.toMatchObject({ code: "forbidden" });
    const sub = await grantManualSubscription(t.db, admin, { userId: client.id, planId: plan.id, method: "dinheiro" }, NOW);
    expect(sub).toMatchObject({ status: "active", provider: "manual", paymentMethod: "MANUAL", nextChargeAt: null });
    const renewed = await grantManualSubscription(t.db, admin, { userId: client.id, planId: plan.id, method: "pix_balcao" }, NOW);
    expect(renewed.id).toBe(sub.id);
    expect(renewed.currentPeriodEnd?.toISOString()).toBe(addCycle(addCycle(NOW, "MONTHLY"), "MONTHLY").toISOString());
    const paid = await t.db.select().from(payments).where(eq(payments.subscriptionId, sub.id));
    expect(paid.map((p) => p.status)).toEqual(["paid", "paid"]);
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
