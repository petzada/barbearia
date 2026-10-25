import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { Db } from "./db";
import { feedbacks, scheduleEntries, services, user } from "./db/schema";
import { assertAdmin, type Actor } from "./actor";
import { DomainError } from "./errors";
import { feedbackSchema, type FeedbackInput } from "@/lib/validations/profile";

/** Avaliação liberada até 30 dias após a conclusão. */
export const FEEDBACK_WINDOW_DAYS = 30;

export async function createFeedback(
  db: Db,
  actor: Actor,
  input: FeedbackInput,
  now: Date = new Date(),
): Promise<void> {
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError("invalid", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const entry = await db.query.scheduleEntries.findFirst({
    where: eq(scheduleEntries.id, parsed.data.entryId),
  });
  if (!entry || entry.clientId !== actor.id) {
    throw new DomainError("not_found", "Atendimento não encontrado.");
  }
  if (entry.status !== "completed" || !entry.completedAt) {
    throw new DomainError("invalid", "Só dá para avaliar atendimentos concluídos.");
  }
  if (now.getTime() - entry.completedAt.getTime() > FEEDBACK_WINDOW_DAYS * 86_400_000) {
    throw new DomainError("invalid", "O prazo para avaliar este atendimento terminou.");
  }
  const [row] = await db
    .insert(feedbacks)
    .values({
      entryId: entry.id,
      clientId: actor.id,
      barberId: entry.barberId,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      createdAt: now,
    })
    .onConflictDoNothing({ target: feedbacks.entryId })
    .returning({ id: feedbacks.id });
  if (!row) throw new DomainError("conflict", "Você já avaliou este atendimento.");
}

const barberUser = alias(user, "barber_user");
const clientUser = alias(user, "client_user");

/** Atendimentos concluídos do cliente ainda sem avaliação (dentro do prazo). */
export async function listPendingFeedback(db: Db, clientId: string, now: Date = new Date()) {
  return db
    .select({
      entryId: scheduleEntries.id,
      startsAt: scheduleEntries.startsAt,
      barberName: barberUser.name,
      serviceName: services.name,
    })
    .from(scheduleEntries)
    .innerJoin(barberUser, eq(barberUser.id, scheduleEntries.barberId))
    .innerJoin(services, eq(services.id, scheduleEntries.serviceId))
    .leftJoin(feedbacks, eq(feedbacks.entryId, scheduleEntries.id))
    .where(
      and(
        eq(scheduleEntries.clientId, clientId),
        eq(scheduleEntries.status, "completed"),
        isNull(feedbacks.id),
        gte(scheduleEntries.completedAt, new Date(now.getTime() - FEEDBACK_WINDOW_DAYS * 86_400_000)),
      ),
    )
    .orderBy(desc(scheduleEntries.startsAt));
}

export async function listFeedbackHistory(
  db: Db,
  actor: Actor,
  opts: { barberId?: string; limit?: number; lowOnly?: boolean } = {},
) {
  if (opts.barberId && opts.barberId === actor.id && actor.isBarber) {
    // barbeiro vê as próprias avaliações
  } else {
    assertAdmin(actor);
  }
  return db
    .select({
      id: feedbacks.id,
      rating: feedbacks.rating,
      comment: feedbacks.comment,
      createdAt: feedbacks.createdAt,
      clientName: clientUser.name,
      clientPhone: clientUser.phoneNumber,
      barberName: barberUser.name,
      serviceName: services.name,
      startsAt: scheduleEntries.startsAt,
    })
    .from(feedbacks)
    .innerJoin(scheduleEntries, eq(scheduleEntries.id, feedbacks.entryId))
    .innerJoin(barberUser, eq(barberUser.id, feedbacks.barberId))
    .innerJoin(clientUser, eq(clientUser.id, feedbacks.clientId))
    .leftJoin(services, eq(services.id, scheduleEntries.serviceId))
    .where(
      and(
        opts.barberId ? eq(feedbacks.barberId, opts.barberId) : undefined,
        opts.lowOnly ? lte(feedbacks.rating, 3) : undefined,
      ),
    )
    .orderBy(desc(feedbacks.createdAt))
    .limit(opts.limit ?? 50);
}

export async function getRatingsByBarber(db: Db) {
  return db
    .select({
      barberId: feedbacks.barberId,
      name: barberUser.name,
      average: sql<number>`round(avg(${feedbacks.rating}), 2)`,
      count: sql<number>`count(*)`,
    })
    .from(feedbacks)
    .innerJoin(barberUser, eq(barberUser.id, feedbacks.barberId))
    .groupBy(feedbacks.barberId, barberUser.name);
}

export type FeedbackStats = {
  average: number | null;
  total: number;
  /** Quantidade por nota: índice 0 = 1★ … índice 4 = 5★. */
  distribution: [number, number, number, number, number];
  byBarber: { barberId: string; name: string; average: number; count: number }[];
};

/** Resumo da gestão: média, distribuição 5★–1★ e média por barbeiro. */
export async function getFeedbackStats(db: Db, actor: Actor): Promise<FeedbackStats> {
  assertAdmin(actor);
  const [counts, byBarber] = await Promise.all([
    db
      .select({ rating: feedbacks.rating, n: sql<number>`count(*)` })
      .from(feedbacks)
      .groupBy(feedbacks.rating),
    getRatingsByBarber(db),
  ]);
  const distribution: FeedbackStats["distribution"] = [0, 0, 0, 0, 0];
  let sum = 0;
  let total = 0;
  for (const c of counts) {
    distribution[c.rating - 1] = c.n;
    sum += c.rating * c.n;
    total += c.n;
  }
  return {
    average: total ? Math.round((sum / total) * 10) / 10 : null,
    total,
    distribution,
    byBarber: byBarber
      .map((b) => ({ ...b, average: Number(b.average) }))
      .sort((a, b) => b.average - a.average),
  };
}
