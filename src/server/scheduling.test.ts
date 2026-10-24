import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/test/d1";
import { createAdmin, createBarber, createUser, sp } from "@/test/factories";
import { payments, scheduleEntries, shopSettings } from "./db/schema";
import {
  cancelAppointment,
  completeAppointment,
  computeCommissionCents,
  createAppointment,
  createBlock,
  getAvailableSlots,
  listAgendaForDay,
  listClientAppointments,
  listPendingCompletion,
  markNoShow,
  registerLocalPayment,
  removeBlock,
} from "./scheduling";
import { DomainError } from "./errors";

// 2026-11-02 é segunda (seed: 09:00–19:00). "Agora" fica no dia anterior.
const DAY = "2026-11-02";
const NOW = sp("2026-11-01", "10:00");

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
beforeEach(() => t.reset());
afterAll(() => t.dispose());

async function setup() {
  const barber = await createBarber(t.db, { name: "Moura" });
  const client = await createUser(t.db, { name: "João" });
  return { barber, client };
}

const book = (
  actor: Awaited<ReturnType<typeof setup>>["client"],
  barberId: string,
  hhmm: string,
  serviceId = "svc-corte",
  paymentChoice: "pix" | "local" = "local",
) =>
  createAppointment(
    t.db,
    actor,
    { barberId, serviceId, startsAt: sp(DAY, hhmm).getTime(), paymentChoice },
    NOW,
  );

describe("disponibilidade", () => {
  it("lista a grade do dia e remove horários ocupados", async () => {
    const { barber, client } = await setup();
    const before = await getAvailableSlots(t.db, {
      barberId: barber.id, serviceId: "svc-corte", dateKey: DAY, now: NOW,
    });
    expect(before).toHaveLength(20); // 09:00 … 18:30

    await book(client, barber.id, "10:00", "svc-combo"); // 10:00–11:00
    const after = await getAvailableSlots(t.db, {
      barberId: barber.id, serviceId: "svc-corte", dateKey: DAY, now: NOW,
    });
    expect(after).not.toContain(sp(DAY, "10:00").getTime());
    expect(after).not.toContain(sp(DAY, "10:30").getTime());
    expect(after).toContain(sp(DAY, "11:00").getTime());
  });

  it("respeita a janela de agendamento configurada pelo admin", async () => {
    const { barber } = await setup();
    await t.db.update(shopSettings).set({ bookingWindowDays: 1 }).where(eq(shopSettings.id, 1));
    const slots = await getAvailableSlots(t.db, {
      barberId: barber.id, serviceId: "svc-corte", dateKey: DAY, now: NOW,
    });
    expect(slots).toEqual([]);
  });
});

describe("criação de agendamento", () => {
  it("grava preço de tabela e status de pagamento conforme a escolha", async () => {
    const { barber, client } = await setup();
    const local = await book(client, barber.id, "09:00", "svc-corte", "local");
    expect(local).toMatchObject({ status: "booked", priceCents: 4500, paymentMethod: "local", paymentStatus: "unpaid" });
    const pix = await book(client, barber.id, "10:00", "svc-barba", "pix");
    expect(pix).toMatchObject({ priceCents: 3500, paymentMethod: "pix", paymentStatus: "pending" });
    expect(pix.endsAt.getTime() - pix.startsAt.getTime()).toBe(30 * 60_000);
  });

  it("duas reservas simultâneas no mesmo horário: só uma vence", async () => {
    const { barber, client } = await setup();
    const other = await createUser(t.db);
    const results = await Promise.allSettled([
      book(client, barber.id, "14:00"),
      book(other, barber.id, "14:00"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(DomainError);
    expect((rejected.reason as DomainError).code).toBe("conflict");
    const rows = await t.db.select().from(scheduleEntries);
    expect(rows).toHaveLength(1);
  });

  it("rejeita horário fora da grade, serviço inativo e barbeiro sem reservas", async () => {
    const { barber, client } = await setup();
    await expect(book(client, barber.id, "09:10")).rejects.toMatchObject({ code: "conflict" });
    await expect(book(client, barber.id, "19:00")).rejects.toMatchObject({ code: "conflict" });

    const closed = await createBarber(t.db, { acceptingBookings: false });
    await expect(book(client, closed.id, "09:00")).rejects.toMatchObject({ code: "invalid" });
    await expect(book(client, client.id, "09:00")).rejects.toMatchObject({ code: "invalid" });
  });

  it("bloqueio impede agendamento e vice-versa", async () => {
    const { barber, client } = await setup();
    await createBlock(t.db, barber, {
      barberId: barber.id,
      startsAt: sp(DAY, "12:00").getTime(),
      endsAt: sp(DAY, "13:00").getTime(),
      note: "Almoço",
    });
    await expect(book(client, barber.id, "12:30")).rejects.toMatchObject({ code: "conflict" });

    await book(client, barber.id, "15:00");
    await expect(
      createBlock(t.db, barber, {
        barberId: barber.id,
        startsAt: sp(DAY, "14:30").getTime(),
        endsAt: sp(DAY, "15:30").getTime(),
      }),
    ).rejects.toMatchObject({ code: "conflict" });
  });

  it("cancelado libera o horário de novo", async () => {
    const { barber, client } = await setup();
    const entry = await book(client, barber.id, "16:00");
    await cancelAppointment(t.db, client, entry.id, NOW);
    await expect(book(client, barber.id, "16:00")).resolves.toMatchObject({ status: "booked" });
  });
});

describe("cancelamento", () => {
  it("cliente respeita o prazo configurado; barbeiro e admin não", async () => {
    const { barber, client } = await setup();
    const admin = await createAdmin(t.db);
    const entry = await book(client, barber.id, "09:00");
    const lateNow = sp(DAY, "07:30"); // 1h30 antes, prazo padrão = 2h

    await expect(cancelAppointment(t.db, client, entry.id, lateNow)).rejects.toThrow(/2h antes/);
    await cancelAppointment(t.db, barber, entry.id, lateNow);

    const second = await book(client, barber.id, "10:00");
    await cancelAppointment(t.db, admin, second.id, lateNow);
    const rows = await t.db.select().from(scheduleEntries);
    expect(rows.every((r) => r.status === "cancelled")).toBe(true);
  });

  it("terceiros não cancelam e cancelar marca Pix pendente como cancelado", async () => {
    const { barber, client } = await setup();
    const stranger = await createUser(t.db);
    const otherBarber = await createBarber(t.db);
    const entry = await book(client, barber.id, "11:00", "svc-corte", "pix");
    await t.db.insert(payments).values({
      userId: client.id, kind: "appointment", entryId: entry.id, provider: "abacatepay",
      method: "PIX", amountCents: 4500, providerId: "pix_char_1",
    });

    await expect(cancelAppointment(t.db, stranger, entry.id, NOW)).rejects.toMatchObject({ code: "forbidden" });
    await expect(cancelAppointment(t.db, otherBarber, entry.id, NOW)).rejects.toMatchObject({ code: "forbidden" });

    await cancelAppointment(t.db, client, entry.id, NOW);
    const [payment] = await t.db.select().from(payments);
    expect(payment.status).toBe("cancelled");
  });
});

describe("bloqueios", () => {
  it("barbeiro só bloqueia a própria agenda; admin bloqueia qualquer uma", async () => {
    const { barber } = await setup();
    const other = await createBarber(t.db);
    const admin = await createAdmin(t.db);
    const range = { startsAt: sp(DAY, "17:00").getTime(), endsAt: sp(DAY, "18:00").getTime() };

    await expect(createBlock(t.db, other, { barberId: barber.id, ...range })).rejects.toMatchObject({ code: "forbidden" });
    const block = await createBlock(t.db, admin, { barberId: barber.id, ...range });
    await expect(removeBlock(t.db, other, block.id)).rejects.toMatchObject({ code: "forbidden" });
    await removeBlock(t.db, barber, block.id);
  });
});

describe("conclusão, falta e comissão", () => {
  it("grava snapshot da comissão (% do barbeiro sobre o preço de tabela)", async () => {
    const { barber, client } = await setup(); // 40%
    const entry = await book(client, barber.id, "09:00", "svc-combo"); // R$ 75
    const after = sp(DAY, "10:05");

    await expect(completeAppointment(t.db, barber, entry.id, sp(DAY, "08:59"))).rejects.toThrow(/depois do horário/);
    await completeAppointment(t.db, barber, entry.id, after);
    const [row] = await t.db.select().from(scheduleEntries).where(eq(scheduleEntries.id, entry.id));
    expect(row).toMatchObject({ status: "completed", commissionPercent: 40, commissionCents: 3000 });
    await expect(completeAppointment(t.db, barber, entry.id, after)).rejects.toMatchObject({ code: "invalid" });
  });

  it("falta não gera comissão e outro barbeiro não finaliza", async () => {
    const { barber, client } = await setup();
    const other = await createBarber(t.db);
    const entry = await book(client, barber.id, "09:00");
    await expect(markNoShow(t.db, other, entry.id, sp(DAY, "10:00"))).rejects.toMatchObject({ code: "forbidden" });
    await markNoShow(t.db, barber, entry.id, sp(DAY, "10:00"));
    const [row] = await t.db.select().from(scheduleEntries);
    expect(row).toMatchObject({ status: "no_show", commissionCents: null });
  });

  it("computeCommissionCents arredonda e limita o percentual", () => {
    expect(computeCommissionCents(4500, 33)).toBe(1485);
    expect(computeCommissionCents(4500, 150)).toBe(4500);
    expect(computeCommissionCents(4500, -5)).toBe(0);
  });

  it("lista pendentes de conclusão por barbeiro", async () => {
    const { barber, client } = await setup();
    await book(client, barber.id, "09:00");
    await book(client, barber.id, "15:00");
    const pending = await listPendingCompletion(t.db, barber, { barberId: barber.id, now: sp(DAY, "12:00") });
    expect(pending).toHaveLength(1);
    await expect(listPendingCompletion(t.db, client)).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("pagamento no balcão", () => {
  it("registra pagamento manual e marca o agendamento como pago", async () => {
    const { barber, client } = await setup();
    const entry = await book(client, barber.id, "09:00", "svc-corte", "pix");
    await registerLocalPayment(t.db, barber, entry.id, "dinheiro", sp(DAY, "09:40"));
    const [row] = await t.db.select().from(scheduleEntries);
    expect(row).toMatchObject({ paymentStatus: "paid", paymentMethod: "local" });
    const [payment] = await t.db.select().from(payments);
    expect(payment).toMatchObject({ provider: "manual", method: "dinheiro", status: "paid", amountCents: 4500 });
    await expect(registerLocalPayment(t.db, barber, entry.id, "cartao")).rejects.toThrow(/já está pago/);
  });
});

describe("consultas", () => {
  it("agenda do dia com nomes e lista do cliente com feedback/pix", async () => {
    const { barber, client } = await setup();
    await book(client, barber.id, "09:00");
    await createBlock(t.db, barber, {
      barberId: barber.id, startsAt: sp(DAY, "12:00").getTime(), endsAt: sp(DAY, "13:00").getTime(),
    });
    const agenda = await listAgendaForDay(t.db, barber, { dateKey: DAY, barberId: barber.id });
    expect(agenda.map((a) => [a.type, a.clientName, a.serviceName, a.barberName])).toEqual([
      ["appointment", "João", "Corte", "Moura"],
      ["block", null, null, "Moura"],
    ]);
    await expect(listAgendaForDay(t.db, barber, { dateKey: DAY })).rejects.toMatchObject({ code: "forbidden" });

    const mine = await listClientAppointments(t.db, client.id, { upcomingOnly: true, now: NOW });
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ hasFeedback: false, pendingPixPaymentId: null });
  });
});
