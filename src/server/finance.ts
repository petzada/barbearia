import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { Db } from "./db";
import { payments, scheduleEntries, services, user } from "./db/schema";
import { assertAdmin, type Actor } from "./actor";
import { periodBounds, type Period } from "./reports";

const clientUser = alias(user, "client_user");
const barberUser = alias(user, "barber_user");

export type ReceiptRow = {
  id: string;
  paidAt: Date | null;
  kind: "appointment" | "subscription";
  provider: "abacatepay" | "manual";
  method: string;
  amountCents: number;
  clientName: string | null;
};

/** Recebimentos pagos no período (extrato do Financeiro). */
export async function listReceipts(
  db: Db,
  actor: Actor,
  period: Period,
  opts: { method?: "online" | "balcao" } = {},
): Promise<ReceiptRow[]> {
  assertAdmin(actor);
  const { start, end } = periodBounds(period);
  return db
    .select({
      id: payments.id,
      paidAt: payments.paidAt,
      kind: payments.kind,
      provider: payments.provider,
      method: payments.method,
      amountCents: payments.amountCents,
      clientName: clientUser.name,
    })
    .from(payments)
    .leftJoin(clientUser, eq(clientUser.id, payments.userId))
    .where(
      and(
        eq(payments.status, "paid"),
        gte(payments.paidAt, start),
        lt(payments.paidAt, end),
        opts.method === "online"
          ? eq(payments.provider, "abacatepay")
          : opts.method === "balcao"
            ? eq(payments.provider, "manual")
            : undefined,
      ),
    )
    .orderBy(desc(payments.paidAt));
}

export type CommissionLine = {
  id: string;
  startsAt: Date;
  barberId: string;
  barberName: string;
  clientName: string | null;
  serviceName: string | null;
  priceCents: number;
  commissionPercent: number;
  commissionCents: number;
  paid: boolean;
};

/** Atendimentos concluídos com a comissão de cada um (detalhe e CSV). */
export async function listCommissionLines(
  db: Db,
  actor: Actor,
  period: Period,
  opts: { barberId?: string } = {},
): Promise<CommissionLine[]> {
  assertAdmin(actor);
  const { start, end } = periodBounds(period);
  const rows = await db
    .select({
      id: scheduleEntries.id,
      startsAt: scheduleEntries.startsAt,
      barberId: scheduleEntries.barberId,
      barberName: barberUser.name,
      clientName: clientUser.name,
      serviceName: services.name,
      priceCents: scheduleEntries.priceCents,
      commissionPercent: scheduleEntries.commissionPercent,
      commissionCents: scheduleEntries.commissionCents,
      payoutId: scheduleEntries.payoutId,
    })
    .from(scheduleEntries)
    .innerJoin(barberUser, eq(barberUser.id, scheduleEntries.barberId))
    .leftJoin(clientUser, eq(clientUser.id, scheduleEntries.clientId))
    .leftJoin(services, eq(services.id, scheduleEntries.serviceId))
    .where(
      and(
        eq(scheduleEntries.status, "completed"),
        gte(scheduleEntries.startsAt, start),
        lt(scheduleEntries.startsAt, end),
        opts.barberId ? eq(scheduleEntries.barberId, opts.barberId) : undefined,
      ),
    )
    .orderBy(asc(scheduleEntries.startsAt));
  return rows.map(({ payoutId, ...r }) => ({
    ...r,
    priceCents: r.priceCents ?? 0,
    commissionPercent: r.commissionPercent ?? 0,
    commissionCents: r.commissionCents ?? 0,
    paid: payoutId != null,
  }));
}
