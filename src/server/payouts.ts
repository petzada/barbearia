import { and, desc, eq, gte, isNotNull, isNull, lt, sql } from "drizzle-orm";
import type { Db } from "./db";
import { commissionPayouts, scheduleEntries, user } from "./db/schema";
import { assertAdmin, assertCanManageBarberAgenda, type Actor } from "./actor";
import { DomainError } from "./errors";
import { periodBounds, type Period } from "./reports";

export type CommissionSummaryRow = {
  barberId: string;
  name: string;
  image: string | null;
  completed: number;
  generatedCents: number;
  paidCents: number;
  toPayCents: number;
};

/** Comissões do período por barbeiro: geradas, já repassadas e a repassar. */
export async function getCommissionSummary(
  db: Db,
  actor: Actor,
  period: Period,
): Promise<CommissionSummaryRow[]> {
  assertAdmin(actor);
  const { start, end } = periodBounds(period);
  const rows = await db
    .select({
      barberId: scheduleEntries.barberId,
      name: user.name,
      image: user.image,
      completed: sql<number>`count(*)`,
      generatedCents: sql<number>`coalesce(sum(${scheduleEntries.commissionCents}), 0)`,
      paidCents: sql<number>`coalesce(sum(case when ${scheduleEntries.payoutId} is not null then ${scheduleEntries.commissionCents} else 0 end), 0)`,
    })
    .from(scheduleEntries)
    .innerJoin(user, eq(user.id, scheduleEntries.barberId))
    .where(
      and(
        eq(scheduleEntries.status, "completed"),
        gte(scheduleEntries.startsAt, start),
        lt(scheduleEntries.startsAt, end),
      ),
    )
    .groupBy(scheduleEntries.barberId, user.name, user.image);
  return rows
    .map((r) => ({ ...r, toPayCents: r.generatedCents - r.paidCents }))
    .sort((a, b) => b.generatedCents - a.generatedCents);
}

/** Recebido x a receber do barbeiro (no período e o total pendente). */
export async function getBarberPayoutStatus(
  db: Db,
  actor: Actor,
  barberId: string,
  period: Period,
): Promise<{ receivedCents: number; toReceiveCents: number; pendingAllTimeCents: number }> {
  assertCanManageBarberAgenda(actor, barberId);
  const { start, end } = periodBounds(period);
  const [inPeriod, allTime] = await Promise.all([
    db
      .select({
        received: sql<number>`coalesce(sum(case when ${scheduleEntries.payoutId} is not null then ${scheduleEntries.commissionCents} else 0 end), 0)`,
        toReceive: sql<number>`coalesce(sum(case when ${scheduleEntries.payoutId} is null then ${scheduleEntries.commissionCents} else 0 end), 0)`,
      })
      .from(scheduleEntries)
      .where(
        and(
          eq(scheduleEntries.barberId, barberId),
          eq(scheduleEntries.status, "completed"),
          gte(scheduleEntries.startsAt, start),
          lt(scheduleEntries.startsAt, end),
        ),
      )
      .get(),
    db
      .select({ pending: sql<number>`coalesce(sum(${scheduleEntries.commissionCents}), 0)` })
      .from(scheduleEntries)
      .where(
        and(
          eq(scheduleEntries.barberId, barberId),
          eq(scheduleEntries.status, "completed"),
          isNull(scheduleEntries.payoutId),
          isNotNull(scheduleEntries.commissionCents),
        ),
      )
      .get(),
  ]);
  return {
    receivedCents: inPeriod?.received ?? 0,
    toReceiveCents: inPeriod?.toReceive ?? 0,
    pendingAllTimeCents: allTime?.pending ?? 0,
  };
}

export const PAYOUT_METHODS = ["pix", "dinheiro", "transferencia"] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];
export const PAYOUT_METHOD_LABELS: Record<PayoutMethod, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
};

/**
 * Fecha o repasse do barbeiro no período: marca os atendimentos concluídos
 * ainda não pagos e grava o valor. Tudo numa transação (batch) — rodar duas
 * vezes não paga em dobro.
 */
export async function closePayout(
  db: Db,
  actor: Actor,
  input: { barberId: string; period: Period; method: PayoutMethod; note?: string | null },
  now: Date = new Date(),
): Promise<typeof commissionPayouts.$inferSelect> {
  assertAdmin(actor);
  if (!(PAYOUT_METHODS as readonly string[]).includes(input.method)) {
    throw new DomainError("invalid", "Forma de pagamento inválida.");
  }
  const { start, end } = periodBounds(input.period);
  const id = crypto.randomUUID();
  const scope = and(
    eq(scheduleEntries.barberId, input.barberId),
    eq(scheduleEntries.status, "completed"),
    isNull(scheduleEntries.payoutId),
    gte(scheduleEntries.startsAt, start),
    lt(scheduleEntries.startsAt, end),
  );
  await db.batch([
    db.insert(commissionPayouts).values({
      id,
      barberId: input.barberId,
      periodFrom: input.period.from,
      periodTo: input.period.to,
      method: input.method,
      note: input.note?.trim() || null,
      paidAt: now,
      recordedById: actor.id,
    }),
    db.update(scheduleEntries).set({ payoutId: id }).where(scope),
    db
      .update(commissionPayouts)
      .set({
        amountCents: sql`(select coalesce(sum(commission_cents), 0) from schedule_entries where payout_id = ${id})`,
        entriesCount: sql`(select count(*) from schedule_entries where payout_id = ${id})`,
      })
      .where(eq(commissionPayouts.id, id)),
  ]);
  const payout = (await db.query.commissionPayouts.findFirst({ where: eq(commissionPayouts.id, id) }))!;
  if (payout.entriesCount === 0) {
    await db.delete(commissionPayouts).where(eq(commissionPayouts.id, id));
    throw new DomainError("invalid", "Não há comissões a repassar neste período.");
  }
  return payout;
}

export async function listPayouts(db: Db, actor: Actor, opts: { barberId?: string; limit?: number } = {}) {
  if (opts.barberId) assertCanManageBarberAgenda(actor, opts.barberId);
  else assertAdmin(actor);
  return db
    .select({
      id: commissionPayouts.id,
      barberId: commissionPayouts.barberId,
      barberName: user.name,
      periodFrom: commissionPayouts.periodFrom,
      periodTo: commissionPayouts.periodTo,
      amountCents: commissionPayouts.amountCents,
      entriesCount: commissionPayouts.entriesCount,
      method: commissionPayouts.method,
      note: commissionPayouts.note,
      paidAt: commissionPayouts.paidAt,
    })
    .from(commissionPayouts)
    .innerJoin(user, eq(user.id, commissionPayouts.barberId))
    .where(opts.barberId ? eq(commissionPayouts.barberId, opts.barberId) : undefined)
    .orderBy(desc(commissionPayouts.paidAt))
    .limit(opts.limit ?? 50);
}
