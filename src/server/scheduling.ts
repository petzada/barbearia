import { and, asc, desc, eq, gte, lt, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { Db } from "./db";
import {
  feedbacks,
  payments,
  scheduleEntries,
  services,
  user,
  type EntryStatus,
} from "./db/schema";
import { assertCanManageBarberAgenda, type Actor } from "./actor";
import { DomainError } from "./errors";
import { getShopSettings } from "./settings";
import { loadScheduleContext } from "./schedule-config";
import { getService } from "./catalog";
import { exceedsVisitLimit, getClubSubscription, getCoverage } from "./club-coverage";
import { computeAvailableSlots } from "@/lib/agenda/slots";
import {
  canClientCancel,
  dateKeyFromIsoInSP,
  formatMinutesShort,
  getSelectableDateKeys,
  isDateInBookingWindow,
} from "@/lib/agenda/availability";
import { spDayBounds } from "@/lib/agenda/timezone";
import {
  createAppointmentSchema,
  createBlockSchema,
  type CreateAppointmentInput,
  type CreateBlockInput,
  type LocalPaymentMethod,
} from "@/lib/validations/agendamento";

export type ScheduleEntry = typeof scheduleEntries.$inferSelect;

const SLOT_TAKEN_MSG =
  "Esse horário acabou de ser preenchido. Escolha outro horário.";

/** Status que ocupam a agenda (tudo menos cancelado). */
const occupiesAgenda = ne(scheduleEntries.status, "cancelled");

async function busyRangesForDay(db: Db, barberId: string, dateKey: string) {
  return busyRangesBetween(db, barberId, dateKey, dateKey);
}

/** Ocupação do barbeiro entre dois dias civis (SP), inclusive — uma única consulta. */
async function busyRangesBetween(db: Db, barberId: string, fromKey: string, toKey: string) {
  const start = spDayBounds(fromKey).start;
  const end = spDayBounds(toKey).end;
  const rows = await db
    .select({ startsAt: scheduleEntries.startsAt, endsAt: scheduleEntries.endsAt })
    .from(scheduleEntries)
    .where(
      and(
        eq(scheduleEntries.barberId, barberId),
        occupiesAgenda,
        lt(scheduleEntries.startsAt, new Date(end)),
        sql`${scheduleEntries.endsAt} > ${Date.parse(start)}`,
      ),
    );
  return rows.map((r) => ({ startsAt: r.startsAt.getTime(), endsAt: r.endsAt.getTime() }));
}

/** Horários livres (epoch ms) de um barbeiro para um serviço em um dia (SP). */
export async function getAvailableSlots(
  db: Db,
  input: { barberId: string; serviceId: string; dateKey: string; now?: Date },
): Promise<number[]> {
  const now = input.now ?? new Date();
  const [settings, schedule, service, busy] = await Promise.all([
    getShopSettings(db),
    loadScheduleContext(db, input.barberId, input.dateKey, input.dateKey),
    getService(db, input.serviceId),
    busyRangesForDay(db, input.barberId, input.dateKey),
  ]);
  if (!service?.active) return [];
  if (!isDateInBookingWindow(input.dateKey, settings.bookingWindowDays, now)) return [];

  return computeAvailableSlots({
    dateKey: input.dateKey,
    hours: schedule.hoursFor(input.dateKey),
    durationMinutes: service.durationMinutes,
    rules: settings,
    busy,
    now: now.getTime(),
  });
}

/**
 * Dias (YYYY-MM-DD, SP) entre `from` e `to` com pelo menos um horário livre.
 * Usado para destacar o calendário do agendamento.
 */
export async function getAvailableDays(
  db: Db,
  input: { barberId: string; serviceId: string; from: string; to: string; now?: Date },
): Promise<string[]> {
  const now = input.now ?? new Date();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.from) || !/^\d{4}-\d{2}-\d{2}$/.test(input.to)) {
    throw new DomainError("invalid", "Período inválido.");
  }
  const [settings, schedule, service, busy] = await Promise.all([
    getShopSettings(db),
    loadScheduleContext(db, input.barberId, input.from, input.to),
    getService(db, input.serviceId),
    busyRangesBetween(db, input.barberId, input.from, input.to),
  ]);
  if (!service?.active) return [];
  const windowKeys = new Set(getSelectableDateKeys(settings.bookingWindowDays, now));
  const days: string[] = [];
  for (const dateKey of windowKeys) {
    if (dateKey < input.from || dateKey > input.to) continue;
    const slots = computeAvailableSlots({
      dateKey,
      hours: schedule.hoursFor(dateKey),
      durationMinutes: service.durationMinutes,
      rules: settings,
      busy,
      now: now.getTime(),
    });
    if (slots.length > 0) days.push(dateKey);
  }
  return days.sort();
}

/**
 * Insere uma entrada só se não houver sobreposição ativa no mesmo barbeiro.
 * Um único INSERT … SELECT … WHERE NOT EXISTS é atômico no D1 (as escritas
 * são serializadas), substituindo a exclusion constraint do Postgres.
 */
export async function insertWithoutOverlap(
  db: Db,
  values: {
    barberId: string;
    type: "appointment" | "block";
    clientId: string | null;
    serviceId: string | null;
    startsAt: number;
    endsAt: number;
    note: string | null;
    priceCents: number | null;
    paymentMethod: "pix" | "local" | "subscription" | null;
    paymentStatus: "pending" | "paid" | "unpaid" | null;
  },
): Promise<string | null> {
  const id = crypto.randomUUID();
  const result = await db.run(sql`
    insert into schedule_entries (
      id, barber_id, type, client_id, service_id, starts_at, ends_at, status,
      note, price_cents, payment_method, payment_status, created_at
    )
    select
      ${id}, ${values.barberId}, ${values.type}, ${values.clientId}, ${values.serviceId},
      ${values.startsAt}, ${values.endsAt}, 'booked', ${values.note}, ${values.priceCents},
      ${values.paymentMethod}, ${values.paymentStatus}, ${Date.now()}
    where not exists (
      select 1 from schedule_entries
      where barber_id = ${values.barberId}
        and status <> 'cancelled'
        and starts_at < ${values.endsAt}
        and ends_at > ${values.startsAt}
    )
  `);
  return result.meta.changes === 1 ? id : null;
}

export async function createAppointment(
  db: Db,
  actor: Actor,
  input: CreateAppointmentInput,
  now: Date = new Date(),
): Promise<ScheduleEntry> {
  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError("invalid", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { barberId, serviceId, startsAt, paymentChoice } = parsed.data;

  const [service, barber] = await Promise.all([
    getService(db, serviceId),
    db.query.user.findFirst({ where: eq(user.id, barberId) }),
  ]);
  if (!service?.active) {
    throw new DomainError("invalid", "Serviço indisponível. Escolha outro serviço.");
  }
  if (!barber?.isBarber || !barber.acceptingBookings) {
    throw new DomainError("invalid", "Este barbeiro não está recebendo agendamentos.");
  }
  if (barber.id === actor.id) {
    throw new DomainError("invalid", "Use um bloqueio para reservar a sua própria agenda.");
  }

  const dateKey = dateKeyFromIsoInSP(startsAt);
  const slots = await getAvailableSlots(db, { barberId, serviceId, dateKey, now });
  if (!slots.includes(startsAt)) {
    throw new DomainError("conflict", SLOT_TAKEN_MSG);
  }

  // Clube: se o plano cobre serviço + dia e ainda há atendimentos no ciclo,
  // o horário sai pago pela assinatura (sem Pix). Comissão segue a tabela.
  const coverage = await getCoverage(db, actor.id, { serviceId, startsAt, now });
  const regular = {
    paymentMethod: paymentChoice,
    paymentStatus: paymentChoice === "pix" ? ("pending" as const) : ("unpaid" as const),
  };

  const id = await insertWithoutOverlap(db, {
    barberId,
    type: "appointment",
    clientId: actor.id,
    serviceId,
    startsAt,
    endsAt: startsAt + service.durationMinutes * 60_000,
    note: null,
    priceCents: service.priceCents,
    ...(coverage.covered
      ? { paymentMethod: "subscription" as const, paymentStatus: "paid" as const }
      : regular),
  });
  if (!id) throw new DomainError("conflict", SLOT_TAKEN_MSG);

  if (coverage.covered) {
    // Reconfere depois de gravar: em reservas simultâneas, quem passou do
    // limite do ciclo volta a ser cobrado normalmente.
    const sub = await getClubSubscription(db, actor.id, new Date(startsAt), now);
    if (
      sub &&
      (await exceedsVisitLimit(db, {
        userId: actor.id,
        entryId: id,
        windowStart: sub.windowStart,
        periodEnd: sub.periodEnd,
        visitsPerCycle: sub.rules.visitsPerCycle,
      }))
    ) {
      await db.update(scheduleEntries).set(regular).where(eq(scheduleEntries.id, id));
    }
  }

  return (await getEntry(db, id))!;
}

export async function getEntry(db: Db, id: string): Promise<ScheduleEntry | undefined> {
  return db.query.scheduleEntries.findFirst({ where: eq(scheduleEntries.id, id) });
}

async function requireEntry(db: Db, id: string): Promise<ScheduleEntry> {
  const entry = await getEntry(db, id);
  if (!entry) throw new DomainError("not_found", "Agendamento não encontrado.");
  return entry;
}

/**
 * Cancela um agendamento.
 * - Cliente: só o próprio e com antecedência maior que o prazo configurado.
 * - Barbeiro (própria agenda) e admin: a qualquer momento enquanto estiver marcado.
 */
export async function cancelAppointment(
  db: Db,
  actor: Actor,
  entryId: string,
  now: Date = new Date(),
): Promise<void> {
  const entry = await requireEntry(db, entryId);
  if (entry.type !== "appointment") {
    throw new DomainError("invalid", "Use a opção de remover bloqueio.");
  }
  const isOwnerClient = entry.clientId === actor.id;
  const isStaff = actor.isAdmin || (actor.isBarber && entry.barberId === actor.id);
  if (!isOwnerClient && !isStaff) {
    throw new DomainError("forbidden", "Você não pode cancelar este agendamento.");
  }
  if (entry.status !== "booked") {
    throw new DomainError("invalid", "Este agendamento não está mais ativo.");
  }
  if (!isStaff) {
    const { cancelUntilMinutes } = await getShopSettings(db);
    if (!canClientCancel(entry.startsAt, cancelUntilMinutes, now)) {
      throw new DomainError(
        "invalid",
        `Cancelamento pelo app só até ${formatMinutesShort(cancelUntilMinutes)} antes. Fale com a barbearia.`,
      );
    }
  }

  await db.batch([
    db
      .update(scheduleEntries)
      .set({ status: "cancelled", cancelledAt: now, cancelledById: actor.id })
      .where(and(eq(scheduleEntries.id, entryId), eq(scheduleEntries.status, "booked"))),
    db
      .update(payments)
      .set({ status: "cancelled" })
      .where(and(eq(payments.entryId, entryId), eq(payments.status, "pending"))),
  ]);
}

export async function createBlock(
  db: Db,
  actor: Actor,
  input: CreateBlockInput,
): Promise<ScheduleEntry> {
  const parsed = createBlockSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError("invalid", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  assertCanManageBarberAgenda(actor, parsed.data.barberId);
  const id = await insertWithoutOverlap(db, {
    barberId: parsed.data.barberId,
    type: "block",
    clientId: null,
    serviceId: null,
    startsAt: parsed.data.startsAt,
    endsAt: parsed.data.endsAt,
    note: parsed.data.note,
    priceCents: null,
    paymentMethod: null,
    paymentStatus: null,
  });
  if (!id) {
    throw new DomainError(
      "conflict",
      "Conflito com outro horário da agenda. Cancele os agendamentos afetados primeiro.",
    );
  }
  return (await getEntry(db, id))!;
}

export async function removeBlock(db: Db, actor: Actor, entryId: string): Promise<void> {
  const entry = await requireEntry(db, entryId);
  if (entry.type !== "block") throw new DomainError("invalid", "Isto não é um bloqueio.");
  assertCanManageBarberAgenda(actor, entry.barberId);
  await db
    .update(scheduleEntries)
    .set({ status: "cancelled", cancelledAt: new Date(), cancelledById: actor.id })
    .where(eq(scheduleEntries.id, entryId));
}

/** Snapshot de comissão: % do barbeiro sobre o preço de tabela gravado no agendamento. */
export function computeCommissionCents(priceCents: number, percent: number): number {
  return Math.round((priceCents * Math.min(100, Math.max(0, percent))) / 100);
}

async function finishAppointment(
  db: Db,
  actor: Actor,
  entryId: string,
  status: Extract<EntryStatus, "completed" | "no_show">,
  now: Date,
): Promise<void> {
  const entry = await requireEntry(db, entryId);
  if (entry.type !== "appointment") throw new DomainError("invalid", "Isto é um bloqueio.");
  assertCanManageBarberAgenda(actor, entry.barberId);
  if (entry.status !== "booked") {
    throw new DomainError("invalid", "Este atendimento já foi finalizado ou cancelado.");
  }
  if (entry.startsAt.getTime() > now.getTime()) {
    throw new DomainError("invalid", "Só é possível finalizar depois do horário de início.");
  }

  if (status === "no_show") {
    await db
      .update(scheduleEntries)
      .set({ status, completedAt: now, completedById: actor.id })
      .where(eq(scheduleEntries.id, entryId));
    return;
  }

  const barber = await db.query.user.findFirst({ where: eq(user.id, entry.barberId) });
  const percent = barber?.commissionPercent ?? 0;
  await db
    .update(scheduleEntries)
    .set({
      status,
      completedAt: now,
      completedById: actor.id,
      commissionPercent: percent,
      commissionCents: computeCommissionCents(entry.priceCents ?? 0, percent),
    })
    .where(and(eq(scheduleEntries.id, entryId), eq(scheduleEntries.status, "booked")));
}

export function completeAppointment(db: Db, actor: Actor, entryId: string, now = new Date()) {
  return finishAppointment(db, actor, entryId, "completed", now);
}

export function markNoShow(db: Db, actor: Actor, entryId: string, now = new Date()) {
  return finishAppointment(db, actor, entryId, "no_show", now);
}

/** Registra pagamento feito no balcão (dinheiro, cartão ou Pix presencial). */
export async function registerLocalPayment(
  db: Db,
  actor: Actor,
  entryId: string,
  method: LocalPaymentMethod,
  now: Date = new Date(),
): Promise<void> {
  const entry = await requireEntry(db, entryId);
  if (entry.type !== "appointment") throw new DomainError("invalid", "Isto é um bloqueio.");
  assertCanManageBarberAgenda(actor, entry.barberId);
  if (entry.paymentStatus === "paid") {
    throw new DomainError("invalid", "Este atendimento já está pago.");
  }
  if (entry.status === "cancelled") {
    throw new DomainError("invalid", "Agendamento cancelado.");
  }

  await db.batch([
    db
      .update(payments)
      .set({ status: "cancelled" })
      .where(and(eq(payments.entryId, entryId), eq(payments.status, "pending"))),
    db.insert(payments).values({
      userId: entry.clientId,
      kind: "appointment",
      entryId,
      provider: "manual",
      method,
      amountCents: entry.priceCents ?? 0,
      status: "paid",
      paidAt: now,
      recordedById: actor.id,
    }),
    db
      .update(scheduleEntries)
      .set({ paymentStatus: "paid", paymentMethod: "local" })
      .where(eq(scheduleEntries.id, entryId)),
  ]);
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

const barberUser = alias(user, "barber_user");
const clientUser = alias(user, "client_user");

export type AgendaItem = {
  id: string;
  type: "appointment" | "block";
  barberId: string;
  barberName: string;
  barberImage: string | null;
  clientId: string | null;
  clientName: string | null;
  clientPhone: string | null;
  serviceId: string | null;
  serviceName: string | null;
  startsAt: Date;
  endsAt: Date;
  status: EntryStatus;
  note: string | null;
  priceCents: number | null;
  paymentMethod: ScheduleEntry["paymentMethod"];
  paymentStatus: ScheduleEntry["paymentStatus"];
  commissionCents: number | null;
};

const agendaColumns = {
  id: scheduleEntries.id,
  type: scheduleEntries.type,
  barberId: scheduleEntries.barberId,
  barberName: barberUser.name,
  barberImage: barberUser.image,
  clientId: scheduleEntries.clientId,
  clientName: clientUser.name,
  clientPhone: clientUser.phoneNumber,
  serviceId: scheduleEntries.serviceId,
  serviceName: services.name,
  startsAt: scheduleEntries.startsAt,
  endsAt: scheduleEntries.endsAt,
  status: scheduleEntries.status,
  note: scheduleEntries.note,
  priceCents: scheduleEntries.priceCents,
  paymentMethod: scheduleEntries.paymentMethod,
  paymentStatus: scheduleEntries.paymentStatus,
  commissionCents: scheduleEntries.commissionCents,
};

function agendaQuery(db: Db) {
  return db
    .select(agendaColumns)
    .from(scheduleEntries)
    .innerJoin(barberUser, eq(barberUser.id, scheduleEntries.barberId))
    .leftJoin(clientUser, eq(clientUser.id, scheduleEntries.clientId))
    .leftJoin(services, eq(services.id, scheduleEntries.serviceId));
}

/** Agenda do dia (SP). Barbeiro vê a própria; admin pode ver todas (`barberId` omitido). */
export async function listAgendaForDay(
  db: Db,
  actor: Actor,
  input: { dateKey: string; barberId?: string },
): Promise<AgendaItem[]> {
  if (input.barberId) assertCanManageBarberAgenda(actor, input.barberId);
  else if (!actor.isAdmin) {
    throw new DomainError("forbidden", "Acesso restrito à gestão.");
  }
  const { start, end } = spDayBounds(input.dateKey);
  return agendaQuery(db)
    .where(
      and(
        input.barberId ? eq(scheduleEntries.barberId, input.barberId) : undefined,
        occupiesAgenda,
        gte(scheduleEntries.startsAt, new Date(start)),
        lt(scheduleEntries.startsAt, new Date(end)),
      ),
    )
    .orderBy(asc(scheduleEntries.startsAt));
}

/** Atendimentos que já passaram e ainda não foram finalizados. */
export async function listPendingCompletion(
  db: Db,
  actor: Actor,
  input: { barberId?: string; now?: Date } = {},
): Promise<AgendaItem[]> {
  if (input.barberId) assertCanManageBarberAgenda(actor, input.barberId);
  else if (!actor.isAdmin) throw new DomainError("forbidden", "Acesso restrito à gestão.");
  const now = input.now ?? new Date();
  return agendaQuery(db)
    .where(
      and(
        input.barberId ? eq(scheduleEntries.barberId, input.barberId) : undefined,
        eq(scheduleEntries.type, "appointment"),
        eq(scheduleEntries.status, "booked"),
        lt(scheduleEntries.startsAt, now),
      ),
    )
    .orderBy(asc(scheduleEntries.startsAt));
}

export type ClientAppointment = AgendaItem & {
  hasFeedback: boolean;
  pendingPixPaymentId: string | null;
};

export async function listClientAppointments(
  db: Db,
  clientId: string,
  opts: { upcomingOnly?: boolean; now?: Date } = {},
): Promise<ClientAppointment[]> {
  const now = opts.now ?? new Date();
  const rows = await agendaQuery(db)
    .where(
      and(
        eq(scheduleEntries.clientId, clientId),
        eq(scheduleEntries.type, "appointment"),
        opts.upcomingOnly
          ? and(eq(scheduleEntries.status, "booked"), gte(scheduleEntries.startsAt, now))
          : undefined,
      ),
    )
    .orderBy(opts.upcomingOnly ? asc(scheduleEntries.startsAt) : desc(scheduleEntries.startsAt));

  if (rows.length === 0) return [];
  const [feedbackRows, pendingPix] = await Promise.all([
    db
      .select({ entryId: feedbacks.entryId })
      .from(feedbacks)
      .where(eq(feedbacks.clientId, clientId)),
    db
      .select({ id: payments.id, entryId: payments.entryId })
      .from(payments)
      .where(
        and(
          eq(payments.userId, clientId),
          eq(payments.kind, "appointment"),
          eq(payments.status, "pending"),
          eq(payments.provider, "abacatepay"),
        ),
      ),
  ]);
  const withFeedback = new Set(feedbackRows.map((f) => f.entryId));
  const pixByEntry = new Map(pendingPix.map((p) => [p.entryId, p.id]));
  return rows.map((r) => ({
    ...r,
    hasFeedback: withFeedback.has(r.id),
    pendingPixPaymentId: pixByEntry.get(r.id) ?? null,
  }));
}

/** Um agendamento do próprio cliente com nomes (tela de sucesso e .ics). */
export async function getClientAppointment(
  db: Db,
  clientId: string,
  entryId: string,
): Promise<AgendaItem | null> {
  const [row] = await agendaQuery(db)
    .where(
      and(
        eq(scheduleEntries.id, entryId),
        eq(scheduleEntries.clientId, clientId),
        eq(scheduleEntries.type, "appointment"),
      ),
    )
    .limit(1);
  return row ?? null;
}
