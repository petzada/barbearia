import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/test/d1";
import { createAdmin, createBarber, createUser, sp } from "@/test/factories";
import {
  account,
  feedbacks,
  payments,
  plans,
  scheduleEntries,
  session,
  subscriptions,
  user,
  whatsappConfig,
} from "./db/schema";
import { completeAppointment, createAppointment, createBlock, getAvailableDays } from "./scheduling";
import { listBookableBarbers } from "./team";
import { deleteOwnAccount, DELETED_ACCOUNT_NAME } from "./account";
import { runDailyReminders, type WhatsappGateway } from "./whatsapp/service";
import { upsertPlan } from "./payments/service";
import type { PaymentGateway } from "./payments/abacatepay";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
beforeEach(() => t.reset());
afterAll(() => t.dispose());

// 2026-11-01 é domingo (fechado no seed). Janela padrão = 30 dias.
const NOW = sp("2026-11-01", "10:00");

describe("getAvailableDays", () => {
  it("lista só dias abertos com horário livre dentro da janela", async () => {
    const barber = await createBarber(t.db);
    const days = await getAvailableDays(t.db, {
      barberId: barber.id, serviceId: "svc-corte", from: "2026-11-01", to: "2026-11-08", now: NOW,
    });
    // domingo 01 e 08 fechados
    expect(days).toEqual(["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"]);
  });

  it("dia totalmente bloqueado some e fora da janela não aparece", async () => {
    const barber = await createBarber(t.db);
    await createBlock(t.db, barber, {
      barberId: barber.id,
      startsAt: sp("2026-11-07", "09:00").getTime(),
      endsAt: sp("2026-11-07", "13:00").getTime(),
      note: "Folga",
    });
    const days = await getAvailableDays(t.db, {
      barberId: barber.id, serviceId: "svc-corte", from: "2026-11-06", to: "2026-12-31", now: NOW,
    });
    expect(days).not.toContain("2026-11-07");
    expect(days).toContain("2026-11-06");
    expect(days.at(-1)! <= "2026-11-30").toBe(true);
  });

  it("rejeita período inválido", async () => {
    await expect(
      getAvailableDays(t.db, { barberId: "x", serviceId: "svc-corte", from: "11/2026", to: "2026-11-02" }),
    ).rejects.toMatchObject({ code: "invalid" });
  });
});

describe("barbeiros com nota média", () => {
  it("calcula média e quantidade; sem avaliações fica null", async () => {
    const moura = await createBarber(t.db, { name: "Moura" });
    await createBarber(t.db, { name: "Léo" });
    const client = await createUser(t.db);
    const entry = await createAppointment(
      t.db, client,
      { barberId: moura.id, serviceId: "svc-corte", startsAt: sp("2026-11-02", "09:00").getTime(), paymentChoice: "local" },
      NOW,
    );
    await completeAppointment(t.db, moura, entry.id, sp("2026-11-02", "10:00"));
    await t.db.insert(feedbacks).values({ entryId: entry.id, clientId: client.id, barberId: moura.id, rating: 5 });
    const barbers = await listBookableBarbers(t.db);
    expect(barbers.map((b) => [b.name, b.ratingAverage, b.ratingCount])).toEqual([
      ["Léo", null, 0],
      ["Moura", 5, 1],
    ]);
  });
});

describe("excluir minha conta (LGPD)", () => {
  async function scenario() {
    const barber = await createBarber(t.db);
    const client = await createUser(t.db, { name: "João Silva", phoneNumber: "+5511960234545" });
    const future = await createAppointment(
      t.db, client,
      { barberId: barber.id, serviceId: "svc-corte", startsAt: sp("2026-11-03", "09:00").getTime(), paymentChoice: "pix" },
      NOW,
    );
    await t.db.insert(payments).values({
      userId: client.id, kind: "appointment", entryId: future.id, provider: "abacatepay",
      method: "PIX", amountCents: 4500, providerId: "pix_char_1",
    });
    await t.db.insert(payments).values({
      userId: client.id, kind: "appointment", provider: "manual", method: "dinheiro",
      amountCents: 3500, status: "paid", paidAt: NOW,
    });
    await t.db.insert(session).values({
      id: "s1", token: "tok", userId: client.id, expiresAt: new Date(NOW.getTime() + 86_400_000),
    });
    await t.db.insert(account).values({ id: "a1", accountId: "g-1", providerId: "google", userId: client.id });
    const admin = await createAdmin(t.db);
    const plan = await upsertPlan(t.db, admin, {
      slug: "mensal", name: "Mensal", priceCents: 9900, cycle: "MONTHLY", benefits: [], active: true, sortOrder: 0,
    });
    await t.db.insert(subscriptions).values({
      userId: client.id, planId: plan.id, status: "active", provider: "abacatepay",
      providerSubscriptionId: "subs_1", currentPeriodEnd: new Date(NOW.getTime() + 20 * 86_400_000),
    });
    return { barber, client, admin, future };
  }

  it("cancela horários, assinatura e Pix, apaga login e anonimiza mantendo o financeiro", async () => {
    const { client, future } = await scenario();
    const gateway = { cancelSubscription: vi.fn(async () => {}) } as unknown as PaymentGateway;
    await deleteOwnAccount(t.db, client, gateway, NOW);

    expect(gateway.cancelSubscription).toHaveBeenCalledWith("subs_1");
    const [row] = await t.db.select().from(user).where(eq(user.id, client.id));
    expect(row).toMatchObject({ name: DELETED_ACCOUNT_NAME, phoneNumber: null, image: null, whatsappReminders: false });
    expect(row.email).toContain("excluida-");
    const [entry] = await t.db.select().from(scheduleEntries).where(eq(scheduleEntries.id, future.id));
    expect(entry.status).toBe("cancelled");
    expect(await t.db.select().from(session)).toHaveLength(0);
    expect(await t.db.select().from(account)).toHaveLength(0);
    const statuses = (await t.db.select().from(payments)).map((p) => p.status).sort();
    expect(statuses).toEqual(["cancelled", "paid"]);
    const [sub] = await t.db.select().from(subscriptions);
    expect(sub.status).toBe("cancelled");
  });

  it("segue mesmo se o AbacatePay falhar", async () => {
    const { client } = await scenario();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const gateway = { cancelSubscription: vi.fn(async () => { throw new Error("offline"); }) } as unknown as PaymentGateway;
    await deleteOwnAccount(t.db, client, gateway, NOW);
    const [sub] = await t.db.select().from(subscriptions);
    expect(sub.status).toBe("cancelled");
    warn.mockRestore();
  });

  it("bloqueia gestão e barbeiros", async () => {
    const { barber, admin } = await scenario();
    await expect(deleteOwnAccount(t.db, admin, null, NOW)).rejects.toThrow(/gestão/);
    await expect(deleteOwnAccount(t.db, barber, null, NOW)).rejects.toThrow(/barbeiro/);
  });
});

describe("preferência de lembretes", () => {
  it("não envia lembrete para quem desligou no perfil", async () => {
    await t.db.update(whatsappConfig).set({ instanceId: "inst-1", status: "connected" }).where(eq(whatsappConfig.id, 1));
    const barber = await createBarber(t.db);
    const on = await createUser(t.db, { phoneNumber: "+5511960234545" });
    const off = await createUser(t.db, { phoneNumber: "+5511960234546", whatsappReminders: false });
    for (const [c, hhmm] of [[on, "15:00"], [off, "16:00"]] as const) {
      await createAppointment(
        t.db, c,
        { barberId: barber.id, serviceId: "svc-corte", startsAt: sp("2026-11-02", hhmm).getTime(), paymentChoice: "local" },
        NOW,
      );
    }
    const gw = {
      sendText: vi.fn(async () => ({})),
      createInstance: vi.fn(), connectInstance: vi.fn(), deleteInstance: vi.fn(),
      listInstances: vi.fn(async () => [{ instanceId: "inst-1", status: "open" }]),
    } as unknown as WhatsappGateway;
    const summary = await runDailyReminders(t.db, gw, sp("2026-11-02", "08:00"));
    expect(summary).toMatchObject({ found: 1, sent: 1 });
  });
});

describe("plano em destaque", () => {
  it("salva o destaque do plano", async () => {
    const admin = await createAdmin(t.db);
    const plan = await upsertPlan(t.db, admin, {
      slug: "premium", name: "Premium", priceCents: 12900, cycle: "MONTHLY", benefits: [], active: true,
      highlighted: true, sortOrder: 0,
    });
    const [row] = await t.db.select().from(plans).where(eq(plans.id, plan.id));
    expect(row.highlighted).toBe(true);
  });
});
