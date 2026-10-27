import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { Db } from "./db";
import { feedbacks, payments, scheduleEntries, services, subscriptions, user } from "./db/schema";
import { isSubscriptionCurrent } from "./payments/subscriptions";
import { assertAdmin, assertCanManageBarberAgenda, type Actor } from "./actor";
import { DomainError } from "./errors";
import { dateKeyFromIsoInSP } from "@/lib/agenda/availability";
import { spDayBounds } from "@/lib/agenda/timezone";

export type Period = { from: string; to: string };

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** [início do dia `from`, fim do dia `to`] em SP como Date. */
export function periodBounds(period: Period): { start: Date; end: Date } {
  if (!KEY_RE.test(period.from) || !KEY_RE.test(period.to) || period.from > period.to) {
    throw new DomainError("invalid", "Período inválido.");
  }
  return {
    start: new Date(spDayBounds(period.from).start),
    end: new Date(spDayBounds(period.to).end),
  };
}

export function eachDateKey(period: Period): string[] {
  const keys: string[] = [];
  const [y, m, d] = period.from.split("-").map(Number);
  for (let i = 0; i < 400; i++) {
    const key = new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10);
    if (key > period.to) break;
    keys.push(key);
  }
  return keys;
}

const barberUser = alias(user, "barber_user");

export type DashboardData = {
  kpis: {
    completedCount: number;
    servicesRevenueCents: number;
    averageTicketCents: number;
    receivedOnlineCents: number;
    receivedLocalCents: number;
    subscriptionRevenueCents: number;
    /** Assinaturas pagas no período por forma: cartão, Pix (online) e balcão. */
    subscriptionByMethodCents: { card: number; pix: number; manual: number };
    commissionsCents: number;
    activeSubscribers: number;
    noShowCount: number;
    cancelledCount: number;
    averageRating: number | null;
    ratingsCount: number;
  };
  /**
   * Por dia (SP): serviços concluídos e comissões pela data do atendimento;
   * clube, avulsos online e balcão pela data do pagamento.
   */
  revenueByDay: {
    dateKey: string;
    servicesCents: number;
    subscriptionsCents: number;
    onlineCents: number;
    balcaoCents: number;
    commissionsCents: number;
  }[];
  topServices: { name: string; count: number; revenueCents: number }[];
  byBarber: {
    barberId: string;
    name: string;
    completed: number;
    revenueCents: number;
    commissionCents: number;
  }[];
};

/** Painel admin: faturamento, recebimentos, comissões e qualidade no período. */
export async function getDashboard(
  db: Db,
  actor: Actor,
  period: Period,
  now: Date = new Date(),
): Promise<DashboardData> {
  assertAdmin(actor);
  const { start, end } = periodBounds(period);

  const [entries, paid, ratingRows, activeSubs] = await Promise.all([
    db
      .select({
        status: scheduleEntries.status,
        startsAt: scheduleEntries.startsAt,
        priceCents: scheduleEntries.priceCents,
        commissionCents: scheduleEntries.commissionCents,
        barberId: scheduleEntries.barberId,
        barberName: barberUser.name,
        serviceName: services.name,
      })
      .from(scheduleEntries)
      .innerJoin(barberUser, eq(barberUser.id, scheduleEntries.barberId))
      .leftJoin(services, eq(services.id, scheduleEntries.serviceId))
      .where(
        and(
          eq(scheduleEntries.type, "appointment"),
          gte(scheduleEntries.startsAt, start),
          lt(scheduleEntries.startsAt, end),
        ),
      ),
    db
      .select({
        kind: payments.kind,
        provider: payments.provider,
        method: payments.method,
        amountCents: payments.amountCents,
        paidAt: payments.paidAt,
      })
      .from(payments)
      .where(and(eq(payments.status, "paid"), gte(payments.paidAt, start), lt(payments.paidAt, end))),
    db
      .select({ rating: feedbacks.rating })
      .from(feedbacks)
      .where(and(gte(feedbacks.createdAt, start), lt(feedbacks.createdAt, end))),
    db
      .select()
      .from(subscriptions)
      .where(inArray(subscriptions.status, ["active", "past_due"])),
  ]);

  const completed = entries.filter((e) => e.status === "completed");
  const servicesRevenueCents = completed.reduce((s, e) => s + (e.priceCents ?? 0), 0);

  const byDay = new Map(
    eachDateKey(period).map((k) => [k, { servicesCents: 0, subscriptionsCents: 0, onlineCents: 0, balcaoCents: 0, commissionsCents: 0 }]),
  );
  for (const e of completed) {
    const bucket = byDay.get(dateKeyFromIsoInSP(e.startsAt));
    if (!bucket) continue;
    bucket.servicesCents += e.priceCents ?? 0;
    bucket.commissionsCents += e.commissionCents ?? 0;
  }
  for (const p of paid) {
    if (!p.paidAt) continue;
    const bucket = byDay.get(dateKeyFromIsoInSP(p.paidAt));
    if (!bucket) continue;
    if (p.kind === "subscription") bucket.subscriptionsCents += p.amountCents;
    else if (p.provider === "abacatepay") bucket.onlineCents += p.amountCents;
    else bucket.balcaoCents += p.amountCents;
  }

  const services_ = new Map<string, { count: number; revenueCents: number }>();
  const barbers = new Map<string, DashboardData["byBarber"][number]>();
  for (const e of completed) {
    const name = e.serviceName ?? "Serviço";
    const svc = services_.get(name) ?? { count: 0, revenueCents: 0 };
    svc.count += 1;
    svc.revenueCents += e.priceCents ?? 0;
    services_.set(name, svc);

    const b = barbers.get(e.barberId) ?? {
      barberId: e.barberId,
      name: e.barberName,
      completed: 0,
      revenueCents: 0,
      commissionCents: 0,
    };
    b.completed += 1;
    b.revenueCents += e.priceCents ?? 0;
    b.commissionCents += e.commissionCents ?? 0;
    barbers.set(e.barberId, b);
  }

  const sum = (rows: typeof paid, pred: (p: (typeof paid)[number]) => boolean) =>
    rows.filter(pred).reduce((s, p) => s + p.amountCents, 0);

  return {
    kpis: {
      completedCount: completed.length,
      servicesRevenueCents,
      averageTicketCents: completed.length ? Math.round(servicesRevenueCents / completed.length) : 0,
      receivedOnlineCents: sum(paid, (p) => p.provider === "abacatepay"),
      receivedLocalCents: sum(paid, (p) => p.provider === "manual"),
      subscriptionRevenueCents: sum(paid, (p) => p.kind === "subscription"),
      subscriptionByMethodCents: {
        card: sum(paid, (p) => p.kind === "subscription" && p.provider === "abacatepay" && p.method === "CARD"),
        pix: sum(paid, (p) => p.kind === "subscription" && p.provider === "abacatepay" && p.method === "PIX"),
        manual: sum(paid, (p) => p.kind === "subscription" && p.provider === "manual"),
      },
      commissionsCents: completed.reduce((s, e) => s + (e.commissionCents ?? 0), 0),
      activeSubscribers: activeSubs.filter((s) => isSubscriptionCurrent(s, now)).length,
      noShowCount: entries.filter((e) => e.status === "no_show").length,
      cancelledCount: entries.filter((e) => e.status === "cancelled").length,
      averageRating: ratingRows.length
        ? Math.round((ratingRows.reduce((s, r) => s + r.rating, 0) / ratingRows.length) * 10) / 10
        : null,
      ratingsCount: ratingRows.length,
    },
    revenueByDay: [...byDay.entries()].map(([dateKey, v]) => ({ dateKey, ...v })),
    topServices: [...services_.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, 5),
    byBarber: [...barbers.values()].sort((a, b) => b.revenueCents - a.revenueCents),
  };
}

export type EarningsData = {
  totalCommissionCents: number;
  totalServicesCents: number;
  completedCount: number;
  items: {
    id: string;
    startsAt: Date;
    serviceName: string | null;
    clientName: string | null;
    priceCents: number;
    commissionPercent: number;
    commissionCents: number;
  }[];
};

/** Ganhos (comissões) de um barbeiro no período. */
export async function getBarberEarnings(
  db: Db,
  actor: Actor,
  barberId: string,
  period: Period,
): Promise<EarningsData> {
  assertCanManageBarberAgenda(actor, barberId);
  const { start, end } = periodBounds(period);
  const clientUser = alias(user, "client_user");
  const rows = await db
    .select({
      id: scheduleEntries.id,
      startsAt: scheduleEntries.startsAt,
      serviceName: services.name,
      clientName: clientUser.name,
      priceCents: scheduleEntries.priceCents,
      commissionPercent: scheduleEntries.commissionPercent,
      commissionCents: scheduleEntries.commissionCents,
    })
    .from(scheduleEntries)
    .leftJoin(services, eq(services.id, scheduleEntries.serviceId))
    .leftJoin(clientUser, eq(clientUser.id, scheduleEntries.clientId))
    .where(
      and(
        eq(scheduleEntries.barberId, barberId),
        eq(scheduleEntries.status, "completed"),
        gte(scheduleEntries.startsAt, start),
        lt(scheduleEntries.startsAt, end),
      ),
    )
    .orderBy(scheduleEntries.startsAt);
  const items = rows.map((r) => ({
    ...r,
    priceCents: r.priceCents ?? 0,
    commissionPercent: r.commissionPercent ?? 0,
    commissionCents: r.commissionCents ?? 0,
  }));
  return {
    items,
    completedCount: items.length,
    totalServicesCents: items.reduce((s, i) => s + i.priceCents, 0),
    totalCommissionCents: items.reduce((s, i) => s + i.commissionCents, 0),
  };
}
