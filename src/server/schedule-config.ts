import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import type { Db } from "./db";
import { barberHours, shopClosures, user } from "./db/schema";
import { assertAdmin, type Actor } from "./actor";
import { DomainError } from "./errors";
import { getBusinessHours } from "./settings";
import { effectiveDayHours, type BarberDayRow, type DayHours } from "@/lib/agenda/slots";
import { barberWeekSchema, closureSchema, type BarberWeekInput, type ClosureInput } from "@/lib/validations/escala";
import { todayDateKeySP } from "@/lib/agenda/timezone";

export type ShopClosure = typeof shopClosures.$inferSelect;

/** Escala do barbeiro (vazia = segue a barbearia). */
export async function getBarberWeek(db: Db, barberId: string): Promise<BarberDayRow[]> {
  return db
    .select({
      weekday: barberHours.weekday,
      startTime: barberHours.startTime,
      endTime: barberHours.endTime,
      isOff: barberHours.isOff,
    })
    .from(barberHours)
    .where(eq(barberHours.barberId, barberId))
    .orderBy(asc(barberHours.weekday));
}

export async function getBarberWeeks(db: Db, barberIds: string[]): Promise<Map<string, BarberDayRow[]>> {
  const map = new Map<string, BarberDayRow[]>(barberIds.map((id) => [id, []]));
  if (barberIds.length === 0) return map;
  const rows = await db.select().from(barberHours).where(inArray(barberHours.barberId, barberIds));
  for (const r of rows) map.get(r.barberId)?.push(r);
  return map;
}

/** Salva a escala semanal (admin). `days: null` volta a seguir a barbearia. */
export async function saveBarberWeek(db: Db, actor: Actor, input: BarberWeekInput): Promise<void> {
  assertAdmin(actor);
  const parsed = barberWeekSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError("invalid", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const target = await db.query.user.findFirst({ where: eq(user.id, parsed.data.barberId) });
  if (!target?.isBarber) throw new DomainError("not_found", "Barbeiro não encontrado.");
  const remove = db.delete(barberHours).where(eq(barberHours.barberId, parsed.data.barberId));
  if (!parsed.data.days) {
    await remove;
    return;
  }
  await db.batch([
    remove,
    db.insert(barberHours).values(parsed.data.days.map((d) => ({ ...d, barberId: parsed.data.barberId }))),
  ]);
}

export async function listClosures(db: Db, opts: { from?: string; to?: string } = {}): Promise<ShopClosure[]> {
  return db
    .select()
    .from(shopClosures)
    .where(
      and(
        opts.from ? gte(shopClosures.dateKey, opts.from) : undefined,
        opts.to ? lte(shopClosures.dateKey, opts.to) : undefined,
      ),
    )
    .orderBy(asc(shopClosures.dateKey));
}

export async function listUpcomingClosures(db: Db, now: Date = new Date()) {
  return listClosures(db, { from: todayDateKeySP(now) });
}

export async function addClosure(db: Db, actor: Actor, input: ClosureInput): Promise<void> {
  assertAdmin(actor);
  const parsed = closureSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError("invalid", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  await db
    .insert(shopClosures)
    .values(parsed.data)
    .onConflictDoUpdate({ target: shopClosures.dateKey, set: { reason: parsed.data.reason } });
}

export async function removeClosure(db: Db, actor: Actor, dateKey: string): Promise<void> {
  assertAdmin(actor);
  await db.delete(shopClosures).where(eq(shopClosures.dateKey, dateKey));
}

/** Tudo que a disponibilidade precisa para um barbeiro num intervalo. */
export async function loadScheduleContext(db: Db, barberId: string, from: string, to: string) {
  const [shopWeek, barberWeek, closures] = await Promise.all([
    getBusinessHours(db),
    getBarberWeek(db, barberId),
    listClosures(db, { from, to }),
  ]);
  const closedDates = new Set(closures.map((c) => c.dateKey));
  return {
    closures,
    hoursFor: (dateKey: string): DayHours | null =>
      effectiveDayHours({ dateKey, shopWeek, barberWeek, closedDates }),
  };
}
