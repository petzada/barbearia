import { and, asc, eq, gt, gte, inArray, lt, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { Db } from "./db";
import { payments, scheduleEntries, services, user } from "./db/schema";
import { assertCanManageBarberAgenda, type Actor } from "./actor";
import { DomainError } from "./errors";
import { getService } from "./catalog";
import { getBarberWeeks, loadScheduleContext, listClosures } from "./schedule-config";
import { getBusinessHours } from "./settings";
import { getEntry, insertWithoutOverlap, type ScheduleEntry } from "./scheduling";
import { effectiveDayHours } from "@/lib/agenda/slots";
import { parseTimeToMinutes } from "@/lib/agenda/timeline";
import { spDayBounds, spLocalDateTimeToIso, todayDateKeySP } from "@/lib/agenda/timezone";
import { normalizeBrazilPhone } from "@/lib/phone";
import { countLabel } from "@/lib/utils";
import {
  blockRangeSchema,
  walkInSchema,
  type BlockRangeInput,
  type WalkInInput,
} from "@/lib/validations/agendamento";

const MAX_BLOCK_DAYS = 60;

function assertStaff(actor: Actor) {
  if (!actor.isBarber && !actor.isAdmin) {
    throw new DomainError("forbidden", "Acesso restrito à equipe.");
  }
}

/** Busca um cliente com conta pelo WhatsApp (encaixe). Só nome e id. */
export async function lookupClientByPhone(
  db: Db,
  actor: Actor,
  rawPhone: string,
): Promise<{ id: string; name: string } | null> {
  assertStaff(actor);
  const phone = normalizeBrazilPhone(rawPhone);
  if (!phone.isValid || !phone.normalized) {
    throw new DomainError("invalid", phone.reason ?? "Telefone inválido.");
  }
  const row = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(eq(user.phoneNumber, `+${phone.normalized}`))
    .get();
  return row ?? null;
}

/** Cliente de balcão sem conta: registro mínimo, sem login nem lembretes. */
async function createWalkInClient(db: Db, name: string): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(user).values({
    id,
    name,
    email: `avulso-${id}@avulso.barbeariadomoura.app`,
    isWalkIn: true,
    profileCompleted: true,
    whatsappReminders: false,
  });
  return id;
}

/**
 * Encaixe feito pela equipe: cliente com conta (pelo WhatsApp) ou só pelo nome.
 * Não aplica antecedência/janela do cliente, mas respeita a trava de
 * sobreposição. Pode ficar fora do expediente (a tela avisa antes).
 */
export async function createWalkInAppointment(
  db: Db,
  actor: Actor,
  input: WalkInInput,
): Promise<ScheduleEntry> {
  const parsed = walkInSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError("invalid", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { barberId, serviceId, startsAt, clientId, walkInName } = parsed.data;
  assertCanManageBarberAgenda(actor, barberId);
  const [service, barber] = await Promise.all([
    getService(db, serviceId),
    db.query.user.findFirst({ where: eq(user.id, barberId) }),
  ]);
  if (!service?.active) throw new DomainError("invalid", "Serviço indisponível.");
  if (!barber?.isBarber) throw new DomainError("not_found", "Barbeiro não encontrado.");

  let resolvedClientId = clientId ?? null;
  if (resolvedClientId) {
    const client = await db.query.user.findFirst({ where: eq(user.id, resolvedClientId) });
    if (!client) throw new DomainError("not_found", "Cliente não encontrado.");
  }

  const endsAt = startsAt + service.durationMinutes * 60_000;
  // Checa conflito antes de criar o cadastro avulso (evita órfãos).
  const conflict = await db
    .select({ id: scheduleEntries.id })
    .from(scheduleEntries)
    .where(
      and(
        eq(scheduleEntries.barberId, barberId),
        ne(scheduleEntries.status, "cancelled"),
        lt(scheduleEntries.startsAt, new Date(endsAt)),
        gt(scheduleEntries.endsAt, new Date(startsAt)),
      ),
    )
    .get();
  if (conflict) throw new DomainError("conflict", "Esse horário já está ocupado na agenda.");

  resolvedClientId ??= await createWalkInClient(db, walkInName!);
  const id = await insertWithoutOverlap(db, {
    barberId,
    type: "appointment",
    clientId: resolvedClientId,
    serviceId,
    startsAt,
    endsAt,
    note: null,
    priceCents: service.priceCents,
    paymentMethod: "local",
    paymentStatus: "unpaid",
  });
  if (!id) throw new DomainError("conflict", "Esse horário acabou de ser ocupado.");
  return (await getEntry(db, id))!;
}

/** O horário do encaixe cai fora do expediente do barbeiro? (aviso na tela) */
export async function isOutsideSchedule(
  db: Db,
  input: { barberId: string; dateKey: string; startTime: string; durationMinutes: number },
): Promise<boolean> {
  const ctx = await loadScheduleContext(db, input.barberId, input.dateKey, input.dateKey);
  const hours = ctx.hoursFor(input.dateKey);
  if (!hours || hours.isClosed) return true;
  const start = parseTimeToMinutes(input.startTime);
  return start < parseTimeToMinutes(hours.openTime) || start + input.durationMinutes > parseTimeToMinutes(hours.closeTime);
}

function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  const [y, m, d] = from.split("-").map(Number);
  for (let i = 0; i <= MAX_BLOCK_DAYS; i++) {
    const key = new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10);
    if (key > to) break;
    out.push(key);
  }
  return out;
}

type PlannedBlock = { dateKey: string; startsAt: number; endsAt: number };

/** Um bloqueio por dia: horário pedido, ou o expediente inteiro (dias fechados pulam). */
async function planBlocks(db: Db, input: ReturnType<typeof blockRangeSchema.parse>): Promise<PlannedBlock[]> {
  const days = eachDay(input.fromDate, input.toDate);
  if (days.length === 0 || days.at(-1)! < input.toDate) {
    throw new DomainError("invalid", `Bloqueie no máximo ${MAX_BLOCK_DAYS} dias por vez.`);
  }
  const ctx = await loadScheduleContext(db, input.barberId, input.fromDate, input.toDate);
  const planned: PlannedBlock[] = [];
  for (const dateKey of days) {
    const hours = ctx.hoursFor(dateKey);
    if (!hours || hours.isClosed) continue; // dia fechado não precisa de bloqueio
    const start = input.startTime ?? hours.openTime;
    const end = input.endTime ?? hours.closeTime;
    planned.push({
      dateKey,
      startsAt: Date.parse(spLocalDateTimeToIso(dateKey, start)),
      endsAt: Date.parse(spLocalDateTimeToIso(dateKey, end)),
    });
  }
  if (planned.length === 0) throw new DomainError("invalid", "A barbearia não abre nos dias escolhidos.");
  return planned;
}

const clientUser = alias(user, "client_user");

export type BlockConflict = {
  id: string;
  startsAt: Date;
  type: "appointment" | "block";
  clientName: string | null;
  serviceName: string | null;
};

async function conflictsFor(db: Db, barberId: string, planned: PlannedBlock[]): Promise<BlockConflict[]> {
  if (planned.length === 0) return [];
  const rows = await db
    .select({
      id: scheduleEntries.id,
      startsAt: scheduleEntries.startsAt,
      endsAt: scheduleEntries.endsAt,
      type: scheduleEntries.type,
      clientName: clientUser.name,
      serviceName: services.name,
    })
    .from(scheduleEntries)
    .leftJoin(clientUser, eq(clientUser.id, scheduleEntries.clientId))
    .leftJoin(services, eq(services.id, scheduleEntries.serviceId))
    .where(
      and(
        eq(scheduleEntries.barberId, barberId),
        ne(scheduleEntries.status, "cancelled"),
        lt(scheduleEntries.startsAt, new Date(planned.at(-1)!.endsAt)),
        gt(scheduleEntries.endsAt, new Date(planned[0].startsAt)),
      ),
    )
    .orderBy(asc(scheduleEntries.startsAt));
  return rows
    .filter((r) =>
      planned.some((p) => r.startsAt.getTime() < p.endsAt && r.endsAt.getTime() > p.startsAt),
    )
    .map(({ endsAt: _e, ...r }) => r);
}

/** Prévia: o que já está marcado no período do bloqueio. */
export async function previewBlockConflicts(db: Db, actor: Actor, input: BlockRangeInput) {
  const parsed = blockRangeSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError("invalid", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  assertCanManageBarberAgenda(actor, parsed.data.barberId);
  const planned = await planBlocks(db, parsed.data);
  return { days: planned.length, conflicts: await conflictsFor(db, parsed.data.barberId, planned) };
}

/**
 * Cria bloqueios em um ou vários dias. Tudo ou nada: se qualquer dia tiver
 * conflito, nenhum bloqueio é criado.
 */
export async function createBlockRange(db: Db, actor: Actor, input: BlockRangeInput): Promise<number> {
  const parsed = blockRangeSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError("invalid", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { barberId, note } = parsed.data;
  assertCanManageBarberAgenda(actor, barberId);
  const planned = await planBlocks(db, parsed.data);
  const conflicts = await conflictsFor(db, barberId, planned);
  if (conflicts.length > 0) {
    throw new DomainError(
      "conflict",
      `Há ${countLabel(conflicts.length, "horário marcado", "horários marcados")} no período. Cancele ou remarque antes de bloquear.`,
    );
  }
  const ids = planned.map(() => crypto.randomUUID());
  const now = Date.now();
  // Batch nativo do D1 = uma transação; cada INSERT só entra se não houver sobreposição.
  const d1 = db.$client;
  const insert = d1.prepare(
    `insert into schedule_entries (id, barber_id, type, starts_at, ends_at, status, note, created_at)
     select ?1, ?2, 'block', ?3, ?4, 'booked', ?5, ?6
     where not exists (
       select 1 from schedule_entries
       where barber_id = ?2 and status <> 'cancelled' and starts_at < ?4 and ends_at > ?3
     )`,
  );
  const results = await d1.batch(planned.map((p, i) => insert.bind(ids[i], barberId, p.startsAt, p.endsAt, note, now)));
  if (results.some((r) => r.meta.changes !== 1)) {
    // Corrida com outro agendamento: desfaz o que entrou (tudo ou nada).
    await db.delete(scheduleEntries).where(inArray(scheduleEntries.id, ids));
    throw new DomainError("conflict", "A agenda mudou enquanto você bloqueava. Tente de novo.");
  }
  return planned.length;
}

export type UpcomingBlock = { id: string; startsAt: Date; endsAt: Date; note: string | null };

/** Próximos bloqueios do barbeiro (para a lista agrupada por data). */
export async function listUpcomingBlocks(
  db: Db,
  actor: Actor,
  barberId: string,
  now: Date = new Date(),
): Promise<UpcomingBlock[]> {
  assertCanManageBarberAgenda(actor, barberId);
  return db
    .select({
      id: scheduleEntries.id,
      startsAt: scheduleEntries.startsAt,
      endsAt: scheduleEntries.endsAt,
      note: scheduleEntries.note,
    })
    .from(scheduleEntries)
    .where(
      and(
        eq(scheduleEntries.barberId, barberId),
        eq(scheduleEntries.type, "block"),
        eq(scheduleEntries.status, "booked"),
        gt(scheduleEntries.endsAt, now),
      ),
    )
    .orderBy(asc(scheduleEntries.startsAt))
    .limit(200);
}

// ---------------------------------------------------------------------------
// Operação do dia (Painel da gestão)
// ---------------------------------------------------------------------------

export type TodayOperation = {
  dateKey: string;
  occupancyPercent: number;
  bookedMinutes: number;
  availableMinutes: number;
  barbers: {
    id: string;
    name: string;
    image: string | null;
    isClosed: boolean;
    appointments: number;
    /** Minutos agendados ÷ disponíveis hoje (0 disponível = folga). */
    bookedMinutes: number;
    availableMinutes: number;
    occupancyPercent: number;
    next: { startsAt: Date; clientName: string; serviceName: string | null } | null;
  }[];
  pendingCompletion: number;
  pendingPix: number;
};

const percentOf = (booked: number, available: number) =>
  available > 0 ? Math.min(100, Math.round((booked / available) * 100)) : 0;

export async function getTodayOperation(db: Db, actor: Actor, now: Date = new Date()): Promise<TodayOperation> {
  if (!actor.isAdmin) throw new DomainError("forbidden", "Acesso restrito à gestão.");
  const dateKey = todayDateKeySP(now);
  const { start, end } = spDayBounds(dateKey);
  const barbers = await db
    .select({ id: user.id, name: user.name, image: user.image })
    .from(user)
    .where(eq(user.isBarber, true));
  const [shopWeek, weeks, closures, entries, pendingCompletionRow, pendingPixRow] = await Promise.all([
    getBusinessHours(db),
    getBarberWeeks(db, barbers.map((b) => b.id)),
    listClosures(db, { from: dateKey, to: dateKey }),
    db
      .select({
        barberId: scheduleEntries.barberId,
        startsAt: scheduleEntries.startsAt,
        endsAt: scheduleEntries.endsAt,
        type: scheduleEntries.type,
        status: scheduleEntries.status,
        clientName: clientUser.name,
        serviceName: services.name,
      })
      .from(scheduleEntries)
      .leftJoin(clientUser, eq(clientUser.id, scheduleEntries.clientId))
      .leftJoin(services, eq(services.id, scheduleEntries.serviceId))
      .where(
        and(
          ne(scheduleEntries.status, "cancelled"),
          gte(scheduleEntries.startsAt, new Date(start)),
          lt(scheduleEntries.startsAt, new Date(end)),
        ),
      )
      .orderBy(asc(scheduleEntries.startsAt)),
    db
      .select({ n: sql<number>`count(*)` })
      .from(scheduleEntries)
      .where(
        and(
          eq(scheduleEntries.type, "appointment"),
          eq(scheduleEntries.status, "booked"),
          lt(scheduleEntries.startsAt, now),
        ),
      )
      .get(),
    db
      .select({ n: sql<number>`count(*)` })
      .from(payments)
      .where(and(eq(payments.status, "pending"), eq(payments.provider, "abacatepay"), gt(payments.expiresAt, now)))
      .get(),
  ]);
  const closedDates = new Set(closures.map((c) => c.dateKey));

  let available = 0;
  let booked = 0;
  const rows = barbers.map((b) => {
    const hours = effectiveDayHours({ dateKey, shopWeek, barberWeek: weeks.get(b.id), closedDates });
    const isClosed = !hours || hours.isClosed;
    const own = entries.filter((e) => e.barberId === b.id);
    const blockedMinutes = own
      .filter((e) => e.type === "block")
      .reduce((s, e) => s + (e.endsAt.getTime() - e.startsAt.getTime()) / 60_000, 0);
    const appts = own.filter((e) => e.type === "appointment");
    let barberAvailable = 0;
    let barberBooked = 0;
    if (!isClosed && hours) {
      barberAvailable = Math.max(
        0,
        parseTimeToMinutes(hours.closeTime) - parseTimeToMinutes(hours.openTime) - blockedMinutes,
      );
      barberBooked = appts.reduce((s, e) => s + (e.endsAt.getTime() - e.startsAt.getTime()) / 60_000, 0);
    }
    available += barberAvailable;
    booked += barberBooked;
    const next = appts.find((e) => e.status === "booked" && e.endsAt > now);
    return {
      id: b.id,
      name: b.name,
      image: b.image,
      isClosed,
      appointments: appts.length,
      bookedMinutes: barberBooked,
      availableMinutes: barberAvailable,
      occupancyPercent: percentOf(barberBooked, barberAvailable),
      next: next ? { startsAt: next.startsAt, clientName: next.clientName ?? "Cliente", serviceName: next.serviceName } : null,
    };
  });

  return {
    dateKey,
    occupancyPercent: percentOf(booked, available),
    bookedMinutes: booked,
    availableMinutes: available,
    barbers: rows.sort((a, b) => a.name.localeCompare(b.name)),
    pendingCompletion: pendingCompletionRow?.n ?? 0,
    pendingPix: pendingPixRow?.n ?? 0,
  };
}
