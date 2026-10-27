import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/test/d1";
import { createAdmin, createBarber, createUser, sp } from "@/test/factories";
import { plans, subscriptions } from "./db/schema";
import { getActiveSubscribersByMonth } from "./club-admin";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
beforeEach(() => t.reset());
afterAll(() => t.dispose());

const NOW = sp("2026-10-27", "10:00");

async function insertSub(values: Partial<typeof subscriptions.$inferInsert>) {
  const client = await createUser(t.db);
  const plan = (await t.db.query.plans.findFirst({ where: eq(plans.slug, "black") }))!;
  await t.db.insert(subscriptions).values({
    userId: client.id,
    planId: plan.id,
    provider: "manual",
    paymentMethod: "MANUAL",
    status: "active",
    createdAt: values.startedAt ?? NOW,
    updatedAt: values.startedAt ?? NOW,
    ...values,
  });
}

describe("assinantes ativos por mês", () => {
  it("conta quem dava acesso no fim de cada mês (SP), com carência e encerramentos", async () => {
    const admin = await createAdmin(t.db);
    // Ativa desde abril, renovando.
    await insertSub({ startedAt: sp("2026-04-10", "12:00"), currentPeriodEnd: sp("2026-11-10", "12:00") });
    // Cancelada na hora em 05/09 (período pago iria até 15/09).
    await insertSub({
      status: "cancelled",
      startedAt: sp("2026-07-15", "12:00"),
      currentPeriodEnd: sp("2026-09-15", "12:00"),
      cancelledAt: sp("2026-09-05", "12:00"),
      updatedAt: sp("2026-09-05", "12:00"),
    });
    // Expirou após a carência do ciclo que venceu em 20/08.
    await insertSub({
      status: "expired",
      paymentMethod: "CARD",
      startedAt: sp("2026-06-01", "12:00"),
      currentPeriodEnd: sp("2026-08-20", "12:00"),
      updatedAt: sp("2026-08-23", "12:00"),
    });
    // Pagamento pendente: venceu em 25/10, ainda na carência agora.
    await insertSub({
      status: "past_due",
      paymentMethod: "CARD",
      startedAt: sp("2026-09-01", "12:00"),
      currentPeriodEnd: sp("2026-10-25", "12:00"),
    });
    // Nunca pagou.
    await insertSub({ status: "pending" });
    // Balcão vencido em 20/10 (não renova): conta até setembro.
    await insertSub({ startedAt: sp("2026-08-01", "12:00"), currentPeriodEnd: sp("2026-10-20", "12:00") });
    // Cancelada no fim do ciclo: pediu em junho, acesso até 10/07.
    await insertSub({
      status: "cancelled",
      startedAt: sp("2026-05-10", "12:00"),
      currentPeriodEnd: sp("2026-07-10", "12:00"),
      cancelledAt: sp("2026-06-15", "12:00"),
      updatedAt: sp("2026-07-10", "13:00"),
    });
    // Começou em 01/10: não conta em setembro.
    await insertSub({ startedAt: sp("2026-10-01", "00:00"), currentPeriodEnd: sp("2026-10-31", "23:59") });

    expect(await getActiveSubscribersByMonth(t.db, admin, { now: NOW })).toEqual([
      { monthKey: "2026-05", count: 2 },
      { monthKey: "2026-06", count: 3 },
      { monthKey: "2026-07", count: 3 },
      { monthKey: "2026-08", count: 3 },
      { monthKey: "2026-09", count: 3 },
      { monthKey: "2026-10", count: 3 },
    ]);
  });

  it("fim do mês no fuso de SP", async () => {
    const admin = await createAdmin(t.db);
    // 30/09 22:00 em SP = 01/10 01:00 UTC: ainda é setembro.
    await insertSub({ startedAt: sp("2026-09-30", "22:00"), currentPeriodEnd: sp("2026-10-30", "22:00") });
    const rows = await getActiveSubscribersByMonth(t.db, admin, { now: NOW, months: 2 });
    expect(rows).toEqual([
      { monthKey: "2026-09", count: 1 },
      { monthKey: "2026-10", count: 1 },
    ]);
  });

  it("só a gestão", async () => {
    const barber = await createBarber(t.db);
    await expect(getActiveSubscribersByMonth(t.db, barber, { now: NOW })).rejects.toMatchObject({ code: "forbidden" });
  });
});
