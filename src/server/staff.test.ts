import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/test/d1";
import { createAdmin, createBarber, createUser, sp } from "@/test/factories";
import { scheduleEntries, services, teamInvites, user, whatsappConfig, whatsappLogs } from "./db/schema";
import { completeAppointment, createAppointment, getAvailableDays, getAvailableSlots } from "./scheduling";
import { addClosure, getBarberWeek, removeClosure, saveBarberWeek } from "./schedule-config";
import { dayBoundsFor } from "./agenda-page";
import {
  createBlockRange,
  createWalkInAppointment,
  getTodayOperation,
  isOutsideSchedule,
  listUpcomingBlocks,
  lookupClientByPhone,
  previewBlockConflicts,
} from "./staff-agenda";
import { closePayout, getBarberPayoutStatus, getCommissionSummary, listPayouts } from "./payouts";
import { listCommissionLines, listReceipts } from "./finance";
import { getClubOverview, getSubscriptionDetail, listPlansWithSubscribers, monthlyEquivalentCents } from "./club-admin";
import { grantManualSubscription, upsertPlan } from "./payments/service";
import { createFeedback, getFeedbackStats, listFeedbackHistory } from "./feedback";
import { reorderServices, setServiceActive, listServices } from "./catalog";
import { applyTeamInvite, inviteTeamMember } from "./team";
import { runDailyReminders, type WhatsappGateway } from "./whatsapp/service";
import { getDashboard } from "./reports";

const DAY = "2026-11-02"; // segunda
const BEFORE = sp("2026-11-01", "10:00");

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
beforeEach(() => t.reset());
afterAll(() => t.dispose());

const fullWeek = (start: string, end: string, offDays: number[] = []) =>
  Array.from({ length: 7 }, (_, weekday) => ({ weekday, startTime: start, endTime: end, isOff: offDays.includes(weekday) }));

describe("escala semanal por barbeiro (27b)", () => {
  it("disponibilidade usa a interseção barbearia ∩ barbeiro", async () => {
    const admin = await createAdmin(t.db);
    const leo = await createBarber(t.db, { name: "Léo" });
    await saveBarberWeek(t.db, admin, { barberId: leo.id, days: fullWeek("14:00", "21:00", [2]) });
    const slots = await getAvailableSlots(t.db, { barberId: leo.id, serviceId: "svc-corte", dateKey: DAY, now: BEFORE });
    expect(slots[0]).toBe(sp(DAY, "14:00").getTime());
    expect(slots.at(-1)).toBe(sp(DAY, "18:30").getTime()); // barbearia fecha 19h
    const tuesday = await getAvailableSlots(t.db, { barberId: leo.id, serviceId: "svc-corte", dateKey: "2026-11-03", now: BEFORE });
    expect(tuesday).toEqual([]);
    const days = await getAvailableDays(t.db, { barberId: leo.id, serviceId: "svc-corte", from: DAY, to: "2026-11-04", now: BEFORE });
    expect(days).toEqual(["2026-11-02", "2026-11-04"]);
  });

  it("só admin edita e `null` volta a seguir a barbearia", async () => {
    const admin = await createAdmin(t.db);
    const leo = await createBarber(t.db);
    await expect(saveBarberWeek(t.db, leo, { barberId: leo.id, days: null })).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      saveBarberWeek(t.db, admin, { barberId: leo.id, days: fullWeek("18:00", "10:00") }),
    ).rejects.toMatchObject({ code: "invalid" });
    await saveBarberWeek(t.db, admin, { barberId: leo.id, days: fullWeek("10:00", "18:00") });
    expect(await getBarberWeek(t.db, leo.id)).toHaveLength(7);
    await saveBarberWeek(t.db, admin, { barberId: leo.id, days: null });
    expect(await getBarberWeek(t.db, leo.id)).toHaveLength(0);
  });
});

describe("feriados e fechamentos (27)", () => {
  it("fecham a disponibilidade e aparecem na agenda", async () => {
    const admin = await createAdmin(t.db);
    const moura = await createBarber(t.db);
    await addClosure(t.db, admin, { dateKey: DAY, reason: "Feriado municipal" });
    expect(await getAvailableSlots(t.db, { barberId: moura.id, serviceId: "svc-corte", dateKey: DAY, now: BEFORE })).toEqual([]);
    expect(await dayBoundsFor(t.db, DAY, moura.id)).toMatchObject({ isClosed: true, closedReason: "Feriado municipal" });
    await removeClosure(t.db, admin, DAY);
    expect((await getAvailableSlots(t.db, { barberId: moura.id, serviceId: "svc-corte", dateKey: DAY, now: BEFORE })).length).toBeGreaterThan(0);
    await expect(addClosure(t.db, moura, { dateKey: DAY, reason: "x" })).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("encaixe (17b)", () => {
  it("cliente com conta pelo WhatsApp ou só pelo nome; respeita sobreposição", async () => {
    const moura = await createBarber(t.db, { name: "Moura" });
    const joao = await createUser(t.db, { name: "João", phoneNumber: "+5511960234545" });
    const found = await lookupClientByPhone(t.db, moura, "(11) 96023-4545");
    expect(found).toEqual({ id: joao.id, name: "João" });

    const a = await createWalkInAppointment(t.db, moura, {
      barberId: moura.id, serviceId: "svc-corte", startsAt: sp(DAY, "09:00").getTime(), clientId: joao.id,
    });
    expect(a).toMatchObject({ clientId: joao.id, priceCents: 4500, paymentMethod: "local", paymentStatus: "unpaid" });

    const b = await createWalkInAppointment(t.db, moura, {
      barberId: moura.id, serviceId: "svc-barba", startsAt: sp(DAY, "20:00").getTime(), walkInName: "Seu Zé",
    });
    const guest = await t.db.query.user.findFirst({ where: eq(user.id, b.clientId!) });
    expect(guest).toMatchObject({ name: "Seu Zé", isWalkIn: true, phoneNumber: null, whatsappReminders: false });

    await expect(
      createWalkInAppointment(t.db, moura, { barberId: moura.id, serviceId: "svc-corte", startsAt: sp(DAY, "09:15").getTime(), walkInName: "Outro" }),
    ).rejects.toMatchObject({ code: "conflict" });
    expect(await t.db.select().from(user).where(eq(user.isWalkIn, true))).toHaveLength(1);
  });

  it("outro barbeiro e cliente não fazem encaixe; avisa fora do expediente", async () => {
    const moura = await createBarber(t.db);
    const leo = await createBarber(t.db);
    const client = await createUser(t.db);
    const input = { barberId: moura.id, serviceId: "svc-corte", startsAt: sp(DAY, "10:00").getTime(), walkInName: "Zé" };
    await expect(createWalkInAppointment(t.db, leo, input)).rejects.toMatchObject({ code: "forbidden" });
    await expect(createWalkInAppointment(t.db, client, input)).rejects.toMatchObject({ code: "forbidden" });
    await expect(lookupClientByPhone(t.db, client, "11960234545")).rejects.toMatchObject({ code: "forbidden" });
    await expect(createWalkInAppointment(t.db, moura, { ...input, walkInName: "" })).rejects.toThrow(/WhatsApp ou digite o nome/);
    expect(await isOutsideSchedule(t.db, { barberId: moura.id, dateKey: DAY, startTime: "18:45", durationMinutes: 30 })).toBe(true);
    expect(await isOutsideSchedule(t.db, { barberId: moura.id, dateKey: DAY, startTime: "10:00", durationMinutes: 30 })).toBe(false);
  });

  it("encaixe avulso conta no financeiro e na comissão", async () => {
    const admin = await createAdmin(t.db);
    const moura = await createBarber(t.db, { commissionPercent: 50 });
    const e = await createWalkInAppointment(t.db, admin, {
      barberId: moura.id, serviceId: "svc-combo", startsAt: sp(DAY, "09:00").getTime(), walkInName: "Seu Zé",
    });
    await completeAppointment(t.db, moura, e.id, sp(DAY, "10:30"));
    const dash = await getDashboard(t.db, admin, { from: DAY, to: DAY });
    expect(dash.kpis).toMatchObject({ completedCount: 1, servicesRevenueCents: 7500, commissionsCents: 3750 });
    const lines = await listCommissionLines(t.db, admin, { from: DAY, to: DAY });
    expect(lines[0]).toMatchObject({ clientName: "Seu Zé", commissionCents: 3750, paid: false });
  });
});

describe("bloqueios de vários dias (18)", () => {
  it("dia inteiro em vários dias pula dias fechados e lista próximos", async () => {
    const moura = await createBarber(t.db);
    // sex 30/10 → seg 02/11 (dom fechado)
    const created = await createBlockRange(t.db, moura, { barberId: moura.id, fromDate: "2026-10-30", toDate: DAY, note: "Férias" });
    expect(created).toBe(3);
    const upcoming = await listUpcomingBlocks(t.db, moura, moura.id, sp("2026-10-29", "12:00"));
    expect(upcoming.map((b) => b.note)).toEqual(["Férias", "Férias", "Férias"]);
    expect(upcoming[2].startsAt.toISOString()).toBe(sp(DAY, "09:00").toISOString());
  });

  it("prévia mostra conflitos e criação é tudo ou nada", async () => {
    const moura = await createBarber(t.db);
    const client = await createUser(t.db, { name: "Ana" });
    await createAppointment(
      t.db, client,
      { barberId: moura.id, serviceId: "svc-corte", startsAt: sp(DAY, "12:30").getTime(), paymentChoice: "local" },
      BEFORE,
    );
    const range = { barberId: moura.id, fromDate: "2026-10-31", toDate: DAY, startTime: "12:00", endTime: "13:00", note: "Almoço" };
    const preview = await previewBlockConflicts(t.db, moura, range);
    expect(preview.days).toBe(2); // sáb e seg
    expect(preview.conflicts).toEqual([expect.objectContaining({ clientName: "Ana", serviceName: "Corte" })]);
    await expect(createBlockRange(t.db, moura, range)).rejects.toMatchObject({ code: "conflict" });
    const blocks = await t.db.select().from(scheduleEntries).where(eq(scheduleEntries.type, "block"));
    expect(blocks).toHaveLength(0);
  });

  it("valida período e permissão", async () => {
    const moura = await createBarber(t.db);
    const leo = await createBarber(t.db);
    await expect(createBlockRange(t.db, leo, { barberId: moura.id, fromDate: DAY, toDate: DAY })).rejects.toMatchObject({ code: "forbidden" });
    await expect(createBlockRange(t.db, moura, { barberId: moura.id, fromDate: DAY, toDate: "2026-11-01" })).rejects.toMatchObject({ code: "invalid" });
    await expect(createBlockRange(t.db, moura, { barberId: moura.id, fromDate: DAY, toDate: "2027-03-01" })).rejects.toThrow(/60 dias/);
    await expect(createBlockRange(t.db, moura, { barberId: moura.id, fromDate: "2026-11-01", toDate: "2026-11-01" })).rejects.toThrow(/não abre/);
  });
});

async function completedScenario() {
  const admin = await createAdmin(t.db);
  const moura = await createBarber(t.db, { name: "Moura", commissionPercent: 50 });
  const client = await createUser(t.db, { name: "João" });
  const book = (hhmm: string, svc: string) =>
    createAppointment(t.db, client, { barberId: moura.id, serviceId: svc, startsAt: sp(DAY, hhmm).getTime(), paymentChoice: "local" }, BEFORE);
  const a = await book("09:00", "svc-combo"); // 3750
  const b = await book("11:00", "svc-corte"); // 2250
  await completeAppointment(t.db, moura, a.id, sp(DAY, "12:00"));
  await completeAppointment(t.db, moura, b.id, sp(DAY, "12:00"));
  return { admin, moura, client, a, b };
}

describe("repasse de comissões (21b)", () => {
  it("fecha o período, marca como pago e não paga em dobro", async () => {
    const { admin, moura } = await completedScenario();
    const period = { from: DAY, to: DAY };
    expect(await getCommissionSummary(t.db, admin, period)).toEqual([
      expect.objectContaining({ name: "Moura", completed: 2, generatedCents: 6000, paidCents: 0, toPayCents: 6000 }),
    ]);
    const payout = await closePayout(t.db, admin, { barberId: moura.id, period, method: "pix" }, sp(DAY, "20:00"));
    expect(payout).toMatchObject({ amountCents: 6000, entriesCount: 2, method: "pix" });
    await expect(closePayout(t.db, admin, { barberId: moura.id, period, method: "pix" })).rejects.toThrow(/Não há comissões/);
    expect((await getCommissionSummary(t.db, admin, period))[0]).toMatchObject({ paidCents: 6000, toPayCents: 0 });
    expect(await getBarberPayoutStatus(t.db, moura, moura.id, period)).toEqual({
      receivedCents: 6000, toReceiveCents: 0, pendingAllTimeCents: 0,
    });
    expect(await listPayouts(t.db, moura, { barberId: moura.id })).toHaveLength(1);
  });

  it("só admin fecha; barbeiro não vê repasses de outro", async () => {
    const { moura } = await completedScenario();
    const leo = await createBarber(t.db);
    await expect(closePayout(t.db, moura, { barberId: moura.id, period: { from: DAY, to: DAY }, method: "pix" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(listPayouts(t.db, leo, { barberId: moura.id })).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("financeiro e clube na gestão (21, 23)", () => {
  it("lista recebimentos por forma e resume o clube com MRR", async () => {
    const admin = await createAdmin(t.db);
    const client = await createUser(t.db, { name: "Pedro", phoneNumber: "+5511987654321" });
    const plan = await upsertPlan(t.db, admin, { slug: "tri", name: "Trimestral", priceCents: 27000, cycle: "QUARTERLY", benefits: [], active: true, sortOrder: 0 });
    const now = sp(DAY, "12:00");
    const sub = await grantManualSubscription(t.db, admin, { userId: client.id, planId: plan.id, method: "dinheiro" }, now);
    const receipts = await listReceipts(t.db, admin, { from: DAY, to: DAY });
    expect(receipts).toEqual([expect.objectContaining({ clientName: "Pedro", amountCents: 27000, provider: "manual" })]);
    expect(await listReceipts(t.db, admin, { from: DAY, to: DAY }, { method: "online" })).toEqual([]);

    const overview = await getClubOverview(t.db, admin, { now });
    expect(overview).toMatchObject({ activeCount: 1, mrrCents: 9000, expiringCount: 0 });
    expect((await getClubOverview(t.db, admin, { now, search: "8765" })).list).toHaveLength(1);
    expect((await getClubOverview(t.db, admin, { now, search: "Maria" })).list).toHaveLength(0);
    const nearEnd = new Date(sub.currentPeriodEnd!.getTime() - 3 * 86_400_000);
    expect((await getClubOverview(t.db, admin, { now: nearEnd, filter: "vencendo" })).list).toHaveLength(1);
    const detail = await getSubscriptionDetail(t.db, admin, sub.id);
    expect(detail.history).toHaveLength(1);
    expect((await listPlansWithSubscribers(t.db, admin, now))[0].subscribers).toBe(1);
  });

  it("MRR normaliza ciclos", () => {
    expect(monthlyEquivalentCents(1200, "ANNUALLY")).toBe(100);
    expect(monthlyEquivalentCents(1000, "WEEKLY")).toBe(4333);
    expect(monthlyEquivalentCents(8900, "MONTHLY")).toBe(8900);
  });
});

describe("operação de hoje (20)", () => {
  it("ocupação, próximo por barbeiro e pendências", async () => {
    const admin = await createAdmin(t.db);
    const moura = await createBarber(t.db, { name: "Moura" });
    const client = await createUser(t.db, { name: "Ana" });
    await createAppointment(t.db, client, { barberId: moura.id, serviceId: "svc-combo", startsAt: sp(DAY, "09:00").getTime(), paymentChoice: "local" }, BEFORE);
    await createAppointment(t.db, client, { barberId: moura.id, serviceId: "svc-corte", startsAt: sp(DAY, "15:00").getTime(), paymentChoice: "local" }, BEFORE);
    const op = await getTodayOperation(t.db, admin, sp(DAY, "11:00"));
    expect(op.availableMinutes).toBe(600);
    expect(op.bookedMinutes).toBe(90);
    expect(op.occupancyPercent).toBe(15);
    expect(op.pendingCompletion).toBe(1);
    expect(op.barbers[0]).toMatchObject({ name: "Moura", appointments: 2, next: expect.objectContaining({ clientName: "Ana" }) });
    await expect(getTodayOperation(t.db, moura)).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("serviços, avaliações e equipe (25, 26, 29)", () => {
  it("reordena e liga/desliga serviços", async () => {
    const admin = await createAdmin(t.db);
    await reorderServices(t.db, admin, ["svc-combo", "svc-corte", "svc-barba"]);
    expect((await listServices(t.db)).map((s) => s.id)).toEqual(["svc-combo", "svc-corte", "svc-barba"]);
    await expect(reorderServices(t.db, admin, ["svc-combo"])).rejects.toMatchObject({ code: "invalid" });
    await setServiceActive(t.db, admin, "svc-barba", false);
    expect((await listServices(t.db)).map((s) => s.id)).toEqual(["svc-combo", "svc-corte"]);
    const [barba] = await t.db.select().from(services).where(eq(services.id, "svc-barba"));
    expect(barba.active).toBe(false);
  });

  it("estatísticas de avaliações e filtro de notas baixas", async () => {
    const { admin, client, a, b } = await completedScenario();
    await createFeedback(t.db, client, { entryId: a.id, rating: 5, comment: "Top" }, sp(DAY, "13:00"));
    await createFeedback(t.db, client, { entryId: b.id, rating: 2, comment: "Atrasou" }, sp(DAY, "13:00"));
    const stats = await getFeedbackStats(t.db, admin);
    expect(stats).toMatchObject({ average: 3.5, total: 2, distribution: [0, 1, 0, 0, 1] });
    expect(stats.byBarber[0]).toMatchObject({ name: "Moura", average: 3.5, count: 2 });
    const low = await listFeedbackHistory(t.db, admin, { lowOnly: true });
    expect(low.map((f) => f.comment)).toEqual(["Atrasou"]);
  });

  it("convite: promove quem já tem conta ou guarda para o primeiro login", async () => {
    const admin = await createAdmin(t.db);
    const existing = await createUser(t.db, { name: "Davi", phoneNumber: "+5511911112222" });
    const send = vi.fn(async () => {});
    expect(await inviteTeamMember(t.db, admin, { phone: "11911112222", isBarber: true, isAdmin: false }, send)).toMatchObject({ status: "promoted" });
    expect((await t.db.query.user.findFirst({ where: eq(user.id, existing.id) }))?.isBarber).toBe(true);
    expect(send).not.toHaveBeenCalled();

    expect(await inviteTeamMember(t.db, admin, { phone: "(11) 93333-4444", isBarber: true, isAdmin: false }, send)).toEqual({ status: "invited" });
    expect(send).toHaveBeenCalledWith("5511933334444");
    const newbie = await createUser(t.db, { phoneNumber: "+5511933334444" });
    expect(await applyTeamInvite(t.db, newbie.id, "+5511933334444")).toBe(true);
    expect((await t.db.query.user.findFirst({ where: eq(user.id, newbie.id) }))?.isBarber).toBe(true);
    expect(await t.db.select().from(teamInvites)).toHaveLength(0);
    await expect(inviteTeamMember(t.db, admin, { phone: "11933334444", isBarber: false, isAdmin: false }, send)).rejects.toMatchObject({ code: "invalid" });
  });
});

describe("lembretes no horário configurado (30)", () => {
  const gateway = () =>
    ({
      sendText: vi.fn(async () => ({})),
      createInstance: vi.fn(),
      connectInstance: vi.fn(async () => ({ state: "open" })),
      deleteInstance: vi.fn(),
      listInstances: vi.fn(async () => [{ instanceId: "inst-1", status: "open" }]),
    }) as unknown as WhatsappGateway;

  it("cron horário só envia na hora escolhida (ou forçado)", async () => {
    await t.db.update(whatsappConfig).set({ instanceId: "inst-1", status: "connected", reminderHour: 10 }).where(eq(whatsappConfig.id, 1));
    const moura = await createBarber(t.db);
    const client = await createUser(t.db, { phoneNumber: "+5511960234545" });
    await createAppointment(t.db, client, { barberId: moura.id, serviceId: "svc-corte", startsAt: sp(DAY, "16:00").getTime(), paymentChoice: "local" }, BEFORE);
    const gw = gateway();
    expect(await runDailyReminders(t.db, gw, sp(DAY, "08:00"))).toMatchObject({ notThisHour: true, sent: 0 });
    expect(await runDailyReminders(t.db, gw, sp(DAY, "10:00"))).toMatchObject({ sent: 1 });
    expect(await runDailyReminders(t.db, gw, sp(DAY, "08:30"), { force: true })).toMatchObject({ alreadySent: 1 });
    expect(await t.db.select().from(whatsappLogs)).toHaveLength(1);
  });
});
