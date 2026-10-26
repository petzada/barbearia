import { and, asc, eq, gt, gte, inArray, lt, sql } from "drizzle-orm";
import type { Db } from "./db";
import { plans, scheduleEntries, subscriptions, type PlanCycle } from "./db/schema";
import { weekdayFromDateKeySP } from "@/lib/agenda/timeline";
import { dateKeyFromIsoInSP } from "@/lib/agenda/availability";

/**
 * Regras do Clube Moura (planos com atendimentos incluídos).
 *
 * Um agendamento é coberto pela assinatura quando:
 * - o cliente tem assinatura ativa com `currentPeriodEnd` depois do início;
 * - o serviço está entre os cobertos pelo plano;
 * - o dia da semana (em São Paulo) é permitido pelo plano (vazio = qualquer dia);
 * - ainda há atendimentos no ciclo atual [fim − 1 ciclo, fim).
 *
 * Contam como usados os agendamentos `subscription` do ciclo marcados,
 * concluídos ou com falta (cancelar devolve o atendimento; faltar consome).
 * Um agendamento (inclusive Corte + Barba) = 1 atendimento. Não acumula.
 */

export const CONSUMING_STATUSES = ["booked", "completed", "no_show"] as const;

export type PlanRules = {
  coveredServiceIds: string[];
  allowedWeekdays: number[];
  visitsPerCycle: number;
};

/** Início do ciclo que termina em `end` (inverso de `addCycle`). */
export function cycleStart(end: Date, cycle: PlanCycle): Date {
  const d = new Date(end.getTime());
  switch (cycle) {
    case "WEEKLY":
      d.setUTCDate(d.getUTCDate() - 7);
      break;
    case "MONTHLY":
      d.setUTCMonth(d.getUTCMonth() - 1);
      break;
    case "QUARTERLY":
      d.setUTCMonth(d.getUTCMonth() - 3);
      break;
    case "SEMIANNUALLY":
      d.setUTCMonth(d.getUTCMonth() - 6);
      break;
    case "ANNUALLY":
      d.setUTCFullYear(d.getUTCFullYear() - 1);
      break;
  }
  return d;
}

export type CoverageReason =
  | "covered"
  | "no_subscription"
  | "service_not_covered"
  | "weekday_not_covered"
  | "no_visits_left"
  | "outside_period";

/** Decide a cobertura sem tocar no banco (testável). */
export function evaluateCoverage(input: {
  rules: PlanRules;
  serviceId: string;
  startsAt: number;
  periodEnd: Date | null;
  windowStart: Date | null;
  usedVisits: number;
}): { covered: boolean; reason: CoverageReason; remaining: number } {
  const { rules, usedVisits } = input;
  const remaining = Math.max(0, rules.visitsPerCycle - usedVisits);
  if (!input.periodEnd || !input.windowStart) return { covered: false, reason: "no_subscription", remaining: 0 };
  if (rules.visitsPerCycle <= 0 || !rules.coveredServiceIds.includes(input.serviceId)) {
    return { covered: false, reason: "service_not_covered", remaining };
  }
  if (input.startsAt >= input.periodEnd.getTime() || input.startsAt < input.windowStart.getTime()) {
    return { covered: false, reason: "outside_period", remaining };
  }
  const weekday = weekdayFromDateKeySP(dateKeyFromIsoInSP(input.startsAt));
  if (rules.allowedWeekdays.length > 0 && !rules.allowedWeekdays.includes(weekday)) {
    return { covered: false, reason: "weekday_not_covered", remaining };
  }
  if (remaining <= 0) return { covered: false, reason: "no_visits_left", remaining: 0 };
  return { covered: true, reason: "covered", remaining };
}

export type ClubSubscription = {
  subscriptionId: string;
  planId: string;
  planName: string;
  cycle: PlanCycle;
  rules: PlanRules;
  periodEnd: Date;
  windowStart: Date;
};

/** Assinatura ativa vigente em `at` (a que vale para o horário pedido). */
export async function getClubSubscription(
  db: Db,
  userId: string,
  at: Date,
): Promise<ClubSubscription | null> {
  const row = await db
    .select({ sub: subscriptions, plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
        gt(subscriptions.currentPeriodEnd, at),
      ),
    )
    .get();
  if (!row?.sub.currentPeriodEnd) return null;
  return {
    subscriptionId: row.sub.id,
    planId: row.plan.id,
    planName: row.plan.name,
    cycle: row.plan.cycle,
    rules: {
      coveredServiceIds: row.plan.coveredServiceIds ?? [],
      allowedWeekdays: row.plan.allowedWeekdays ?? [],
      visitsPerCycle: row.plan.visitsPerCycle,
    },
    periodEnd: row.sub.currentPeriodEnd,
    windowStart: cycleStart(row.sub.currentPeriodEnd, row.plan.cycle),
  };
}

/** Atendimentos do clube já consumidos no ciclo. */
export async function countUsedVisits(
  db: Db,
  userId: string,
  windowStart: Date,
  periodEnd: Date,
): Promise<number> {
  const [{ used }] = await db
    .select({ used: sql<number>`count(*)` })
    .from(scheduleEntries)
    .where(
      and(
        eq(scheduleEntries.clientId, userId),
        eq(scheduleEntries.type, "appointment"),
        eq(scheduleEntries.paymentMethod, "subscription"),
        inArray(scheduleEntries.status, [...CONSUMING_STATUSES]),
        gte(scheduleEntries.startsAt, windowStart),
        lt(scheduleEntries.startsAt, periodEnd),
      ),
    );
  return Number(used);
}

export type Coverage = {
  covered: boolean;
  reason: CoverageReason;
  remaining: number;
  planName: string | null;
  allowedWeekdays: number[];
};

/** Cobertura de um agendamento (serviço + horário) pela assinatura do cliente. */
export async function getCoverage(
  db: Db,
  userId: string,
  input: { serviceId: string; startsAt: number },
): Promise<Coverage> {
  const sub = await getClubSubscription(db, userId, new Date(input.startsAt));
  if (!sub) {
    return { covered: false, reason: "no_subscription", remaining: 0, planName: null, allowedWeekdays: [] };
  }
  const used = await countUsedVisits(db, userId, sub.windowStart, sub.periodEnd);
  const result = evaluateCoverage({
    rules: sub.rules,
    serviceId: input.serviceId,
    startsAt: input.startsAt,
    periodEnd: sub.periodEnd,
    windowStart: sub.windowStart,
    usedVisits: used,
  });
  return { ...result, planName: sub.planName, allowedWeekdays: sub.rules.allowedWeekdays };
}

export type ClubUsage = {
  subscriptionId: string;
  planName: string;
  used: number;
  total: number;
  remaining: number;
  coveredServiceIds: string[];
  allowedWeekdays: number[];
  windowStart: Date;
  periodEnd: Date;
};

/** Uso do ciclo atual (cartão de membro e passo de serviço do agendamento). */
export async function getClubUsage(db: Db, userId: string, now: Date = new Date()): Promise<ClubUsage | null> {
  const sub = await getClubSubscription(db, userId, now);
  if (!sub) return null;
  const used = await countUsedVisits(db, userId, sub.windowStart, sub.periodEnd);
  return {
    subscriptionId: sub.subscriptionId,
    planName: sub.planName,
    used,
    total: sub.rules.visitsPerCycle,
    remaining: Math.max(0, sub.rules.visitsPerCycle - used),
    coveredServiceIds: sub.rules.coveredServiceIds,
    allowedWeekdays: sub.rules.allowedWeekdays,
    windowStart: sub.windowStart,
    periodEnd: sub.periodEnd,
  };
}

/**
 * Pós-checagem de concorrência: dois agendamentos simultâneos podem usar o
 * mesmo último atendimento. Ordena os agendamentos do ciclo por criação e
 * devolve `true` se este passou do limite (o chamador então cobra normalmente).
 */
export async function exceedsVisitLimit(
  db: Db,
  input: { userId: string; entryId: string; windowStart: Date; periodEnd: Date; visitsPerCycle: number },
): Promise<boolean> {
  const rows = await db
    .select({ id: scheduleEntries.id })
    .from(scheduleEntries)
    .where(
      and(
        eq(scheduleEntries.clientId, input.userId),
        eq(scheduleEntries.paymentMethod, "subscription"),
        inArray(scheduleEntries.status, [...CONSUMING_STATUSES]),
        gte(scheduleEntries.startsAt, input.windowStart),
        lt(scheduleEntries.startsAt, input.periodEnd),
        eq(scheduleEntries.type, "appointment"),
      ),
    )
    .orderBy(asc(scheduleEntries.createdAt), asc(scheduleEntries.id));
  const position = rows.findIndex((r) => r.id === input.entryId);
  return position >= input.visitsPerCycle;
}

export { WEEKDAY_SHORT, formatAllowedWeekdays } from "@/lib/plans";
