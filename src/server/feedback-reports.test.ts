import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "@/test/d1";
import { createAdmin, createBarber, createUser, sp } from "@/test/factories";
import { completeAppointment, createAppointment, markNoShow, registerLocalPayment } from "./scheduling";
import { createFeedback, getRatingsByBarber, listFeedbackHistory, listPendingFeedback } from "./feedback";
import { eachDateKey, getBarberEarnings, getDashboard } from "./reports";
import { grantManualSubscription, upsertPlan } from "./payments/service";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
beforeEach(() => t.reset());
afterAll(() => t.dispose());

const DAY = "2026-11-02";
const BEFORE = sp("2026-11-01", "10:00");
const AFTER = sp(DAY, "20:00");

async function scenario() {
  const admin = await createAdmin(t.db);
  const moura = await createBarber(t.db, { name: "Moura", commissionPercent: 50 });
  const leo = await createBarber(t.db, { name: "Léo", commissionPercent: 40 });
  const client = await createUser(t.db, { name: "João" });
  const book = (barberId: string, hhmm: string, serviceId: string) =>
    createAppointment(t.db, client, { barberId, serviceId, startsAt: sp(DAY, hhmm).getTime(), paymentChoice: "local" }, BEFORE);
  const a = await book(moura.id, "09:00", "svc-combo"); // 7500
  const b = await book(moura.id, "11:00", "svc-corte"); // 4500
  const c = await book(leo.id, "09:00", "svc-barba"); // 3500
  const d = await book(leo.id, "10:00", "svc-corte"); // falta
  await completeAppointment(t.db, moura, a.id, AFTER);
  await completeAppointment(t.db, moura, b.id, AFTER);
  await completeAppointment(t.db, leo, c.id, AFTER);
  await markNoShow(t.db, leo, d.id, AFTER);
  await registerLocalPayment(t.db, moura, a.id, "dinheiro", AFTER);
  return { admin, moura, leo, client, a, b, c, d };
}

describe("avaliações", () => {
  it("cliente avalia atendimento concluído uma única vez", async () => {
    const { client, moura, a, d } = await scenario();
    expect(await listPendingFeedback(t.db, client.id, AFTER)).toHaveLength(3);
    await createFeedback(t.db, client, { entryId: a.id, rating: 5, comment: "Top!" }, AFTER);
    await expect(createFeedback(t.db, client, { entryId: a.id, rating: 4 }, AFTER)).rejects.toMatchObject({ code: "conflict" });
    await expect(createFeedback(t.db, client, { entryId: d.id, rating: 1 }, AFTER)).rejects.toThrow(/concluídos/);
    await expect(createFeedback(t.db, moura, { entryId: a.id, rating: 5 }, AFTER)).rejects.toMatchObject({ code: "not_found" });
    expect(await listPendingFeedback(t.db, client.id, AFTER)).toHaveLength(2);
  });

  it("prazo de 30 dias e nota entre 1 e 5", async () => {
    const { client, b } = await scenario();
    await expect(createFeedback(t.db, client, { entryId: b.id, rating: 6 }, AFTER)).rejects.toMatchObject({ code: "invalid" });
    const late = new Date(AFTER.getTime() + 31 * 86_400_000);
    await expect(createFeedback(t.db, client, { entryId: b.id, rating: 4 }, late)).rejects.toThrow(/prazo/);
  });

  it("histórico: admin vê tudo, barbeiro só o próprio", async () => {
    const { admin, client, moura, leo, a, c } = await scenario();
    await createFeedback(t.db, client, { entryId: a.id, rating: 5 }, AFTER);
    await createFeedback(t.db, client, { entryId: c.id, rating: 3 }, AFTER);
    expect(await listFeedbackHistory(t.db, admin)).toHaveLength(2);
    expect(await listFeedbackHistory(t.db, moura, { barberId: moura.id })).toHaveLength(1);
    await expect(listFeedbackHistory(t.db, moura, { barberId: leo.id })).rejects.toMatchObject({ code: "forbidden" });
    const ratings = await getRatingsByBarber(t.db);
    expect(ratings.find((r) => r.name === "Léo")).toMatchObject({ average: 3, count: 1 });
  });
});

describe("painel financeiro", () => {
  it("calcula faturamento, ticket, comissões, recebimentos e faltas", async () => {
    const { admin, client, a } = await scenario();
    await createFeedback(t.db, client, { entryId: a.id, rating: 4 }, AFTER);
    const plan = await upsertPlan(t.db, admin, {
      slug: "mensal", name: "Mensal", priceCents: 9900, cycle: "MONTHLY", benefits: [], active: true, sortOrder: 0,
    });
    await grantManualSubscription(t.db, admin, { userId: client.id, planId: plan.id, method: "dinheiro" }, AFTER);

    const data = await getDashboard(t.db, admin, { from: DAY, to: DAY }, AFTER);
    expect(data.kpis).toMatchObject({
      completedCount: 3,
      servicesRevenueCents: 15500,
      averageTicketCents: 5167,
      commissionsCents: 3750 + 2250 + 1400,
      receivedLocalCents: 7500 + 9900,
      receivedOnlineCents: 0,
      subscriptionRevenueCents: 9900,
      activeSubscribers: 1,
      noShowCount: 1,
      averageRating: 4,
      ratingsCount: 1,
    });
    expect(data.revenueByDay).toEqual([{ dateKey: DAY, servicesCents: 15500, subscriptionsCents: 9900 }]);
    expect(data.topServices[0]).toEqual({ name: "Corte + Barba", count: 1, revenueCents: 7500 });
    expect(data.byBarber.map((b) => [b.name, b.completed, b.commissionCents])).toEqual([
      ["Moura", 2, 6000],
      ["Léo", 1, 1400],
    ]);
  });

  it("só admin acessa e período precisa ser válido", async () => {
    const { moura, admin } = await scenario();
    await expect(getDashboard(t.db, moura, { from: DAY, to: DAY })).rejects.toMatchObject({ code: "forbidden" });
    await expect(getDashboard(t.db, admin, { from: "2026-11-05", to: DAY })).rejects.toMatchObject({ code: "invalid" });
  });

  it("ganhos do barbeiro", async () => {
    const { moura, leo } = await scenario();
    const earnings = await getBarberEarnings(t.db, moura, moura.id, { from: DAY, to: DAY });
    expect(earnings).toMatchObject({ completedCount: 2, totalServicesCents: 12000, totalCommissionCents: 6000 });
    await expect(getBarberEarnings(t.db, leo, moura.id, { from: DAY, to: DAY })).rejects.toMatchObject({ code: "forbidden" });
  });

  it("eachDateKey percorre o período inclusive", () => {
    expect(eachDateKey({ from: "2026-10-30", to: "2026-11-02" })).toEqual([
      "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02",
    ]);
  });
});
