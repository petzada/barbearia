import { and, desc, eq, inArray, like, or } from "drizzle-orm";
import type { Db } from "./db";
import {
  paymentMethods,
  payments,
  plans,
  subscriptions,
  user,
  type PlanCycle,
  type SubscriptionPaymentMethod,
  type SubscriptionStatus,
} from "./db/schema";
import { assertAdmin, type Actor } from "./actor";
import { DomainError } from "./errors";
import { isSubscriptionCurrent } from "./payments/subscriptions";
import { graceEndOf } from "@/lib/club-billing";
import { spDayBounds, todayDateKeySP } from "@/lib/agenda/timezone";

/** Valor mensal equivalente de um plano (para a receita recorrente). */
export function monthlyEquivalentCents(priceCents: number, cycle: PlanCycle): number {
  const factor: Record<PlanCycle, number> = {
    WEEKLY: 52 / 12,
    MONTHLY: 1,
    QUARTERLY: 1 / 3,
    SEMIANNUALLY: 1 / 6,
    ANNUALLY: 1 / 12,
  };
  return Math.round(priceCents * factor[cycle]);
}

const EXPIRING_DAYS = 7;

export type ClubFilter = "ativos" | "pendentes" | "vencendo" | "cancelados";

export type ClubMemberRow = {
  subscriptionId: string;
  userId: string;
  name: string;
  phoneNumber: string | null;
  planName: string;
  priceCents: number;
  cycle: PlanCycle;
  status: SubscriptionStatus;
  paymentMethod: SubscriptionPaymentMethod | null;
  cardLastFour: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  nextChargeAt: Date | null;
  cancelledAt: Date | null;
};

export async function getClubOverview(
  db: Db,
  actor: Actor,
  opts: { filter?: ClubFilter; search?: string; now?: Date } = {},
) {
  assertAdmin(actor);
  const now = opts.now ?? new Date();
  const search = opts.search?.trim();
  const digits = search?.replace(/\D/g, "");
  const rows: ClubMemberRow[] = (
    await db
      .select({
        subscriptionId: subscriptions.id,
        userId: user.id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        planName: plans.name,
        subscriptionPrice: subscriptions.priceCents,
        planPrice: plans.priceCents,
        cycle: plans.cycle,
        status: subscriptions.status,
        paymentMethod: subscriptions.paymentMethod,
        cardLastFour: paymentMethods.lastFour,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        nextChargeAt: subscriptions.nextChargeAt,
        cancelledAt: subscriptions.cancelledAt,
      })
      .from(subscriptions)
      .innerJoin(user, eq(user.id, subscriptions.userId))
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .leftJoin(paymentMethods, eq(paymentMethods.id, subscriptions.paymentMethodId))
      .where(
        and(
          inArray(subscriptions.status, ["active", "past_due", "cancelled", "expired"]),
          search
            ? or(like(user.name, `%${search}%`), digits && digits.length >= 4 ? like(user.phoneNumber, `%${digits}%`) : undefined)
            : undefined,
        ),
      )
      .orderBy(desc(subscriptions.updatedAt))
  ).map(({ subscriptionPrice, planPrice, ...r }) => ({ ...r, priceCents: subscriptionPrice ?? planPrice }));

  const current = rows.filter((r) => isSubscriptionCurrent(r, now));
  const renewing = current.filter((r) => !r.cancelAtPeriodEnd);
  const pastDue = current.filter((r) => r.status === "past_due");
  const expiringLimit = now.getTime() + EXPIRING_DAYS * 86_400_000;
  const expiring = current.filter((r) => r.status === "active" && r.currentPeriodEnd!.getTime() <= expiringLimit);
  const filter = opts.filter ?? "ativos";
  const list =
    filter === "vencendo"
      ? expiring
      : filter === "pendentes"
        ? pastDue
        : filter === "cancelados"
          ? rows.filter((r) => !current.includes(r))
          : current;

  return {
    activeCount: current.length,
    pastDueCount: pastDue.length,
    mrrCents: renewing.reduce((s, r) => s + monthlyEquivalentCents(r.priceCents, r.cycle), 0),
    expiringCount: expiring.length,
    list,
  };
}

export async function getSubscriptionDetail(db: Db, actor: Actor, subscriptionId: string) {
  assertAdmin(actor);
  const row = await db
    .select({ subscription: subscriptions, plan: plans, member: { id: user.id, name: user.name, phoneNumber: user.phoneNumber } })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .innerJoin(user, eq(user.id, subscriptions.userId))
    .where(eq(subscriptions.id, subscriptionId))
    .get();
  if (!row) throw new DomainError("not_found", "Assinatura não encontrada.");
  const [history, card] = await Promise.all([
    db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.subscriptionId, subscriptionId),
          inArray(payments.status, ["paid", "refunded", "disputed", "failed"]),
        ),
      )
      .orderBy(desc(payments.createdAt))
      .limit(24),
    row.subscription.paymentMethodId
      ? db.query.paymentMethods.findFirst({
          where: eq(paymentMethods.id, row.subscription.paymentMethodId),
          columns: { brand: true, lastFour: true },
        })
      : Promise.resolve(undefined),
  ]);
  return { ...row, history, card: card ?? null };
}

/** Planos com a contagem de assinantes vigentes (tela de Planos). */
export async function listPlansWithSubscribers(db: Db, actor: Actor, now: Date = new Date()) {
  assertAdmin(actor);
  const [allPlans, active] = await Promise.all([
    db.select().from(plans).orderBy(plans.sortOrder, plans.priceCents),
    db.select().from(subscriptions).where(inArray(subscriptions.status, ["active", "past_due"])),
  ]);
  return allPlans.map((p) => ({
    ...p,
    subscribers: active.filter((a) => a.planId === p.id && isSubscriptionCurrent(a, now)).length,
  }));
}

type HistorySnapshot = Pick<
  typeof subscriptions.$inferSelect,
  "status" | "startedAt" | "currentPeriodStart" | "currentPeriodEnd" | "paymentMethod" | "cancelAtPeriodEnd" | "updatedAt"
>;

/**
 * Dava acesso no instante `at`? Começa no 1º pagamento (`startedAt`).
 * Vigentes (ativa/pendente) seguem a mesma regra da tela (`isSubscriptionCurrent`,
 * com carência): `currentPeriodEnd` é o fim do último ciclo pago, então cobre
 * todo o passado desde o início. Encerradas (cancelada/expirada) valeram até o
 * fim do período + carência, limitadas a quando foram encerradas — `updatedAt`
 * (cancelamento imediato/estorno, troca por nova assinatura); `cancelledAt` não
 * serve aqui porque no "cancelar no fim do ciclo" ele marca o pedido, não o fim.
 */
export function wasSubscriptionActiveAt(sub: HistorySnapshot, at: Date): boolean {
  const start = sub.startedAt ?? sub.currentPeriodStart;
  if (!start || at < start || !sub.currentPeriodEnd) return false;
  if (sub.status === "active" || sub.status === "past_due") return isSubscriptionCurrent(sub, at);
  if (sub.status === "cancelled" || sub.status === "expired") {
    return at < sub.updatedAt && at < graceEndOf(sub.currentPeriodEnd);
  }
  return false;
}

const addMonths = (year: number, month: number, delta: number) => {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
};
const monthKeyOf = (m: { year: number; month: number }) => `${m.year}-${String(m.month).padStart(2, "0")}`;

/**
 * Assinantes ativos no fim de cada mês (fuso de SP), dos últimos `months`
 * meses; o mês atual é contado agora. Clientes distintos.
 */
export async function getActiveSubscribersByMonth(
  db: Db,
  actor: Actor,
  opts: { months?: number; now?: Date } = {},
): Promise<{ monthKey: string; count: number }[]> {
  assertAdmin(actor);
  const now = opts.now ?? new Date();
  const months = opts.months ?? 6;
  const [year, month] = todayDateKeySP(now).split("-").map(Number);
  const rows = await db
    .select({
      userId: subscriptions.userId,
      status: subscriptions.status,
      startedAt: subscriptions.startedAt,
      currentPeriodStart: subscriptions.currentPeriodStart,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      paymentMethod: subscriptions.paymentMethod,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      updatedAt: subscriptions.updatedAt,
    })
    .from(subscriptions)
    .where(inArray(subscriptions.status, ["active", "past_due", "cancelled", "expired"]));

  return Array.from({ length: months }, (_, i) => {
    const m = addMonths(year, month, i - (months - 1));
    const at =
      i === months - 1 ? now : new Date(new Date(spDayBounds(`${monthKeyOf(addMonths(m.year, m.month, 1))}-01`).start).getTime() - 1);
    const users = new Set(rows.filter((r) => wasSubscriptionActiveAt(r, at)).map((r) => r.userId));
    return { monthKey: monthKeyOf(m), count: users.size };
  });
}
