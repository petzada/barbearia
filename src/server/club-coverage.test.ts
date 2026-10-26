import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/test/d1";
import { createAdmin, createBarber, createUser, sp } from "@/test/factories";
import { plans, scheduleEntries } from "./db/schema";
import { cancelAppointment, completeAppointment, createAppointment, markNoShow } from "./scheduling";
import { grantManualSubscription } from "./payments/service";
import { cycleStart, evaluateCoverage, formatAllowedWeekdays, getClubUsage, getCoverage } from "./club-coverage";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
beforeEach(() => t.reset());
afterAll(() => t.dispose());

// 2026-11-02 = segunda, 03 = terça, 04 = quarta.
const NOW = sp("2026-11-01", "10:00");

async function subscriber(planSlug: "black" | "gold-limitado" | "premium") {
  const admin = await createAdmin(t.db);
  const barber = await createBarber(t.db, { name: "Moura", commissionPercent: 40 });
  const client = await createUser(t.db, { name: "João" });
  const plan = (await t.db.query.plans.findFirst({ where: eq(plans.slug, planSlug) }))!;
  await grantManualSubscription(t.db, admin, { userId: client.id, planId: plan.id, method: "dinheiro" }, NOW);
  const book = (day: string, hhmm: string, serviceId = "svc-corte", paymentChoice: "pix" | "local" = "pix") =>
    createAppointment(
      t.db,
      client,
      { barberId: barber.id, serviceId, startsAt: sp(day, hhmm).getTime(), paymentChoice },
      NOW,
    );
  return { admin, barber, client, plan, book };
}

describe("planos fixos (seed)", () => {
  it("Black, Gold Limitado e Premium com preços e regras", async () => {
    const rows = await t.db.select().from(plans);
    const bySlug = Object.fromEntries(rows.map((p) => [p.slug, p]));
    expect(bySlug.black).toMatchObject({
      priceCents: 12990, cycle: "MONTHLY", active: true, visitsPerCycle: 4,
      coveredServiceIds: ["svc-corte"], allowedWeekdays: [],
    });
    expect(bySlug["gold-limitado"]).toMatchObject({
      priceCents: 17990, visitsPerCycle: 4, allowedWeekdays: [2, 3],
      coveredServiceIds: ["svc-corte", "svc-barba", "svc-combo"],
    });
    expect(bySlug.premium).toMatchObject({ priceCents: 19990, highlighted: true, allowedWeekdays: [] });
  });
});

describe("cobertura no agendamento", () => {
  it("Black cobre corte em qualquer dia, sem Pix, com comissão de tabela", async () => {
    const { barber, book } = await subscriber("black");
    const entry = await book("2026-11-02", "09:00");
    expect(entry).toMatchObject({ paymentMethod: "subscription", paymentStatus: "paid", priceCents: 4500 });
    await completeAppointment(t.db, barber, entry.id, sp("2026-11-02", "10:00"));
    const [row] = await t.db.select().from(scheduleEntries).where(eq(scheduleEntries.id, entry.id));
    expect(row.commissionCents).toBe(1800);
  });

  it("Black não cobre barba: cobra normalmente", async () => {
    const { book } = await subscriber("black");
    const entry = await book("2026-11-02", "09:00", "svc-barba", "local");
    expect(entry).toMatchObject({ paymentMethod: "local", paymentStatus: "unpaid" });
  });

  it("Gold Limitado só cobre terças e quartas", async () => {
    const { book } = await subscriber("gold-limitado");
    expect((await book("2026-11-02", "09:00", "svc-combo", "local")).paymentMethod).toBe("local");
    expect((await book("2026-11-03", "09:00", "svc-combo")).paymentMethod).toBe("subscription");
    expect((await book("2026-11-04", "09:00", "svc-barba")).paymentMethod).toBe("subscription");
  });

  it("4 atendimentos por ciclo: o 5º é cobrado; cancelar devolve; falta consome", async () => {
    const { client, barber, book } = await subscriber("premium");
    const covered = [];
    for (const hhmm of ["09:00", "10:00", "11:00", "14:00"]) covered.push(await book("2026-11-02", hhmm, "svc-combo"));
    expect(covered.every((e) => e.paymentMethod === "subscription")).toBe(true);
    expect((await book("2026-11-02", "15:00", "svc-combo", "local")).paymentMethod).toBe("local");

    await cancelAppointment(t.db, client, covered[3].id, NOW);
    expect((await getClubUsage(t.db, client.id, NOW))?.remaining).toBe(1);
    expect((await book("2026-11-03", "09:00")).paymentMethod).toBe("subscription");

    await markNoShow(t.db, barber, covered[0].id, sp("2026-11-02", "10:30"));
    const usage = await getClubUsage(t.db, client.id, NOW);
    expect(usage).toMatchObject({ used: 4, total: 4, remaining: 0, planName: "Premium" });
  });

  it("horário depois do fim do ciclo não é coberto (não acumula)", async () => {
    const { client } = await subscriber("premium");
    const coverage = await getCoverage(t.db, client.id, {
      serviceId: "svc-corte",
      startsAt: sp("2026-12-05", "10:00").getTime(),
    });
    expect(coverage).toMatchObject({ covered: false, reason: "no_subscription" });
  });

  it("reservas simultâneas no último atendimento: só uma fica pelo plano", async () => {
    const { client, barber } = await subscriber("premium");
    const other = await createBarber(t.db);
    const mk = (barberId: string, hhmm: string) =>
      createAppointment(
        t.db, client,
        { barberId, serviceId: "svc-corte", startsAt: sp("2026-11-02", hhmm).getTime(), paymentChoice: "local" },
        NOW,
      );
    for (const hhmm of ["09:00", "10:00", "11:00"]) await mk(barber.id, hhmm);
    await Promise.all([mk(barber.id, "15:00"), mk(other.id, "15:00")]);
    const usage = await getClubUsage(t.db, client.id, NOW);
    expect(usage?.used).toBe(4);
    const rows = await t.db.select().from(scheduleEntries).where(eq(scheduleEntries.clientId, client.id));
    expect(rows.filter((r) => r.paymentMethod === "subscription")).toHaveLength(4);
    expect(rows.filter((r) => r.paymentMethod === "local")).toHaveLength(1);
  });
});

describe("helpers", () => {
  it("cycleStart é o inverso de um ciclo", () => {
    expect(cycleStart(new Date("2026-12-01T13:00:00Z"), "MONTHLY").toISOString()).toBe("2026-11-01T13:00:00.000Z");
  });
  it("evaluateCoverage sem assinatura", () => {
    expect(
      evaluateCoverage({
        rules: { coveredServiceIds: ["a"], allowedWeekdays: [], visitsPerCycle: 4 },
        serviceId: "a", startsAt: 1, periodEnd: null, windowStart: null, usedVisits: 0,
      }).reason,
    ).toBe("no_subscription");
  });
  it("formata dias permitidos", () => {
    expect(formatAllowedWeekdays([3, 2])).toBe("terças e quartas");
    expect(formatAllowedWeekdays([1, 3, 5])).toBe("segundas, quartas e sextas");
  });
});
