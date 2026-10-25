import { and, desc, eq, inArray, like, or } from "drizzle-orm";
import type { Db } from "./db";
import { payments, plans, subscriptions, user, type PlanCycle } from "./db/schema";
import { assertAdmin, type Actor } from "./actor";
import { DomainError } from "./errors";

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

export type ClubFilter = "ativos" | "vencendo" | "cancelados";

export type ClubMemberRow = {
  subscriptionId: string;
  userId: string;
  name: string;
  phoneNumber: string | null;
  planName: string;
  priceCents: number;
  cycle: PlanCycle;
  status: "pending" | "active" | "cancelled" | "expired";
  provider: "abacatepay" | "manual";
  method: string | null;
  currentPeriodEnd: Date | null;
  cancelledAt: Date | null;
};

const isActive = (s: { status: string; currentPeriodEnd: Date | null }, now: Date) =>
  s.status === "active" && s.currentPeriodEnd != null && s.currentPeriodEnd > now;

export async function getClubOverview(
  db: Db,
  actor: Actor,
  opts: { filter?: ClubFilter; search?: string; now?: Date } = {},
) {
  assertAdmin(actor);
  const now = opts.now ?? new Date();
  const search = opts.search?.trim();
  const digits = search?.replace(/\D/g, "");
  const rows: ClubMemberRow[] = await db
    .select({
      subscriptionId: subscriptions.id,
      userId: user.id,
      name: user.name,
      phoneNumber: user.phoneNumber,
      planName: plans.name,
      priceCents: plans.priceCents,
      cycle: plans.cycle,
      status: subscriptions.status,
      provider: subscriptions.provider,
      method: subscriptions.method,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelledAt: subscriptions.cancelledAt,
    })
    .from(subscriptions)
    .innerJoin(user, eq(user.id, subscriptions.userId))
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(
      and(
        inArray(subscriptions.status, ["active", "cancelled", "expired"]),
        search
          ? or(like(user.name, `%${search}%`), digits && digits.length >= 4 ? like(user.phoneNumber, `%${digits}%`) : undefined)
          : undefined,
      ),
    )
    .orderBy(desc(subscriptions.updatedAt));

  const active = rows.filter((r) => isActive(r, now));
  const expiringLimit = now.getTime() + EXPIRING_DAYS * 86_400_000;
  const expiring = active.filter((r) => r.currentPeriodEnd!.getTime() <= expiringLimit);
  const filter = opts.filter ?? "ativos";
  const list =
    filter === "vencendo"
      ? expiring
      : filter === "cancelados"
        ? rows.filter((r) => !isActive(r, now))
        : active;

  return {
    activeCount: active.length,
    mrrCents: active.reduce((s, r) => s + monthlyEquivalentCents(r.priceCents, r.cycle), 0),
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
  const history = await db
    .select()
    .from(payments)
    .where(and(eq(payments.subscriptionId, subscriptionId), eq(payments.status, "paid")))
    .orderBy(desc(payments.paidAt));
  return { ...row, history };
}

/** Planos com a contagem de assinantes ativos (tela de Planos). */
export async function listPlansWithSubscribers(db: Db, actor: Actor, now: Date = new Date()) {
  assertAdmin(actor);
  const [allPlans, active] = await Promise.all([
    db.select().from(plans).orderBy(plans.sortOrder, plans.priceCents),
    db
      .select({ planId: subscriptions.planId, currentPeriodEnd: subscriptions.currentPeriodEnd })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active")),
  ]);
  return allPlans.map((p) => ({
    ...p,
    subscribers: active.filter((a) => a.planId === p.id && a.currentPeriodEnd && a.currentPeriodEnd > now).length,
  }));
}
