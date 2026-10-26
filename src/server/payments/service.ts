import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import type { Db } from "../db";
import { payments, plans, scheduleEntries, subscriptions, webhookEvents } from "../db/schema";
import { assertAdmin, type Actor } from "../actor";
import { DomainError } from "../errors";
import {
  findIdWithPrefix,
  type AbacateWebhookEvent,
  type CardStatus,
  type PaymentGateway,
  type PixStatus,
} from "./abacatepay";
import { requireGateway } from "./common";
import {
  endSubscriptionNow,
  refreshSubscriptionPayment,
  type BillingDeps,
} from "./subscriptions";
import { planFormSchema, type PlanFormInput } from "@/lib/validations/plano";

export { addCycle, createPaymentGateway } from "./common";
export {
  cancelSubscription,
  changeSubscriptionCard,
  chargeSubscriptionNow,
  createBillingDeps,
  getActiveSubscription,
  getMemberSubscription,
  grantManualSubscription,
  refundLastSubscriptionPayment,
  runSubscriptionBilling,
  subscribeWithCard,
  subscribeWithPix,
} from "./subscriptions";

export type Payment = typeof payments.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;

const PIX_EXPIRES_IN_SECONDS = 30 * 60;

// ---------------------------------------------------------------------------
// Pix avulso do agendamento
// ---------------------------------------------------------------------------

/** Gera (ou reaproveita) o Pix com QR dinâmico de um agendamento do cliente. */
export async function startAppointmentPix(
  db: Db,
  actor: Actor,
  gateway: PaymentGateway | null,
  entryId: string,
  now: Date = new Date(),
): Promise<Payment> {
  const entry = await db.query.scheduleEntries.findFirst({
    where: eq(scheduleEntries.id, entryId),
  });
  if (!entry || entry.clientId !== actor.id) {
    throw new DomainError("not_found", "Agendamento não encontrado.");
  }
  if (entry.status !== "booked") {
    throw new DomainError("invalid", "Este agendamento não está mais ativo.");
  }
  if (entry.paymentStatus === "paid") {
    throw new DomainError("invalid", "Este agendamento já está pago.");
  }

  const existing = await db.query.payments.findFirst({
    where: and(
      eq(payments.entryId, entryId),
      eq(payments.status, "pending"),
      eq(payments.provider, "abacatepay"),
      gt(payments.expiresAt, new Date(now.getTime() + 60_000)),
    ),
  });
  if (existing) return existing;

  const client = requireGateway(gateway);
  const amountCents = entry.priceCents ?? 0;
  if (amountCents < 100) {
    throw new DomainError("invalid", "Valor abaixo do mínimo para Pix online.");
  }
  const paymentId = crypto.randomUUID();
  const charge = await client.createPixCharge({
    amountCents,
    description: "Barbearia do Moura - agendamento",
    expiresInSeconds: PIX_EXPIRES_IN_SECONDS,
    externalId: paymentId,
    metadata: { paymentId, entryId },
  });

  const [row] = await db
    .insert(payments)
    .values({
      id: paymentId,
      userId: actor.id,
      kind: "appointment",
      entryId,
      provider: "abacatepay",
      method: "PIX",
      providerId: charge.id,
      amountCents,
      status: "pending",
      brCode: charge.brCode,
      brCodeBase64: charge.brCodeBase64,
      expiresAt: charge.expiresAt
        ? new Date(charge.expiresAt)
        : new Date(now.getTime() + PIX_EXPIRES_IN_SECONDS * 1000),
      devMode: charge.devMode,
    })
    .returning();
  await db
    .update(scheduleEntries)
    .set({ paymentMethod: "pix", paymentStatus: "pending" })
    .where(eq(scheduleEntries.id, entryId));
  return row;
}

async function markAppointmentPaymentPaid(db: Db, payment: Payment, paidAt: Date) {
  await db.batch([
    db
      .update(payments)
      .set({ status: "paid", paidAt })
      .where(and(eq(payments.id, payment.id), eq(payments.status, "pending"))),
    db
      .update(scheduleEntries)
      .set({ paymentStatus: "paid", paymentMethod: "pix" })
      .where(eq(scheduleEntries.id, payment.entryId!)),
  ]);
}

/**
 * Consulta o status no AbacatePay e sincroniza o banco.
 * Usado pelo polling da tela de Pix e pelo webhook (nunca confia só no payload).
 * Pagamentos do clube seguem as regras de assinatura.
 */
export async function refreshPixPayment(
  db: Db,
  deps: BillingDeps,
  paymentId: string,
  opts: { actor?: Actor; now?: Date } = {},
): Promise<Payment> {
  const payment = await db.query.payments.findFirst({ where: eq(payments.id, paymentId) });
  if (!payment || (opts.actor && payment.userId !== opts.actor.id && !opts.actor.isAdmin)) {
    throw new DomainError("not_found", "Pagamento não encontrado.");
  }
  if (payment.kind === "subscription") return refreshSubscriptionPayment(db, deps, paymentId, opts);
  if (payment.status !== "pending" || !payment.providerId) return payment;

  const now = opts.now ?? new Date();
  const remote = await requireGateway(deps.gateway).checkPixCharge(payment.providerId);
  if (remote.status === "PAID" || remote.status === "APPROVED") {
    await markAppointmentPaymentPaid(db, payment, now);
  } else if (remote.status === "EXPIRED" || remote.status === "CANCELLED" || remote.status === "FAILED") {
    await db.batch([
      db
        .update(payments)
        .set({ status: remote.status === "EXPIRED" ? "expired" : "cancelled" })
        .where(eq(payments.id, payment.id)),
      // Sem Pix pago, o agendamento segue valendo com pagamento na barbearia.
      db
        .update(scheduleEntries)
        .set({ paymentMethod: "local", paymentStatus: "unpaid" })
        .where(and(eq(scheduleEntries.id, payment.entryId!), eq(scheduleEntries.paymentStatus, "pending"))),
    ]);
  }
  return (await db.query.payments.findFirst({ where: eq(payments.id, paymentId) }))!;
}

/** Somente modo de teste (chave dev do AbacatePay): simula o pagamento do Pix. */
export async function simulatePixPayment(
  db: Db,
  actor: Actor,
  deps: BillingDeps,
  paymentId: string,
): Promise<Payment> {
  const payment = await db.query.payments.findFirst({ where: eq(payments.id, paymentId) });
  if (!payment || payment.userId !== actor.id) {
    throw new DomainError("not_found", "Pagamento não encontrado.");
  }
  if (!payment.devMode || !payment.providerId) {
    throw new DomainError("invalid", "Simulação disponível só no modo de teste.");
  }
  await requireGateway(deps.gateway).simulatePixPayment(payment.providerId);
  return refreshPixPayment(db, deps, paymentId, { actor });
}

// ---------------------------------------------------------------------------
// Planos
// ---------------------------------------------------------------------------

export async function listPlans(db: Db, opts: { includeInactive?: boolean } = {}) {
  return db
    .select()
    .from(plans)
    .where(opts.includeInactive ? undefined : eq(plans.active, true))
    .orderBy(asc(plans.sortOrder), asc(plans.priceCents));
}

export async function upsertPlan(db: Db, actor: Actor, input: PlanFormInput): Promise<Plan> {
  assertAdmin(actor);
  const parsed = planFormSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError("invalid", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { id, ...values } = parsed.data;
  if (id) {
    const current = await db.query.plans.findFirst({ where: eq(plans.id, id) });
    if (!current) throw new DomainError("not_found", "Plano não encontrado.");
    // Assinaturas existentes mantêm o valor fixado na adesão (`subscriptions.priceCents`).
    const [row] = await db.update(plans).set(values).where(eq(plans.id, id)).returning();
    await keepSingleHighlight(db, row);
    return row;
  }
  const existingSlug = await db.query.plans.findFirst({ where: eq(plans.slug, values.slug) });
  if (existingSlug) throw new DomainError("conflict", "Já existe um plano com esse identificador.");
  const [row] = await db.insert(plans).values(values).returning();
  await keepSingleHighlight(db, row);
  return row;
}

/** Só um plano pode ser o "Recomendado" da vitrine. */
async function keepSingleHighlight(db: Db, saved: Plan) {
  if (!saved.highlighted) return;
  await db
    .update(plans)
    .set({ highlighted: false })
    .where(and(eq(plans.highlighted, true), sql`${plans.id} <> ${saved.id}`));
}

export async function listUserPayments(db: Db, userId: string, limit = 20) {
  return db
    .select()
    .from(payments)
    .where(and(eq(payments.userId, userId), inArray(payments.status, ["paid", "refunded"])))
    .orderBy(desc(payments.paidAt))
    .limit(limit);
}

// ---------------------------------------------------------------------------
// Webhooks do AbacatePay (idempotentes)
// ---------------------------------------------------------------------------

const PROVIDER_PREFIXES = ["card_", "pix_char_"] as const;

/** Pagamento do evento: pelo id da cobrança ou pela nossa metadata (resposta perdida). */
async function findPaymentForEvent(db: Db, data: unknown): Promise<{ payment: Payment; chargeId: string } | null> {
  for (const prefix of PROVIDER_PREFIXES) {
    const chargeId = findIdWithPrefix(data, prefix);
    if (!chargeId) continue;
    const byProvider = await db.query.payments.findFirst({ where: eq(payments.providerId, chargeId) });
    if (byProvider) return { payment: byProvider, chargeId };
    const paymentId = findMetadataPaymentId(data);
    if (paymentId) {
      const byMetadata = await db.query.payments.findFirst({ where: eq(payments.id, paymentId) });
      if (byMetadata && (!byMetadata.providerId || byMetadata.providerId === chargeId)) {
        if (!byMetadata.providerId) {
          await db.update(payments).set({ providerId: chargeId }).where(eq(payments.id, byMetadata.id));
        }
        return { payment: { ...byMetadata, providerId: chargeId }, chargeId };
      }
    }
  }
  return null;
}

function findMetadataPaymentId(value: unknown, depth = 0): string | null {
  if (depth > 5 || value == null || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const metadata = record.metadata as Record<string, unknown> | undefined;
  if (metadata && typeof metadata.paymentId === "string") return metadata.paymentId;
  for (const nested of Object.values(record)) {
    const found = findMetadataPaymentId(nested, depth + 1);
    if (found) return found;
  }
  return null;
}

/** Status atual na API (o payload do webhook nunca é a fonte da verdade). */
async function remoteStatus(gateway: PaymentGateway, chargeId: string): Promise<PixStatus | CardStatus> {
  if (chargeId.startsWith("card_")) return (await gateway.getCardCharge(chargeId)).status;
  return (await gateway.checkPixCharge(chargeId)).status;
}

/**
 * `transparent.completed` → reconsulta e aplica (agendamento ou clube).
 * `transparent.refunded` / `.lost` → estornado; assinatura encerrada na hora.
 * `transparent.disputed` → contestado; assinatura para de renovar (acesso até o fim do período).
 */
export async function handleAbacateWebhook(
  db: Db,
  billing: BillingDeps,
  event: AbacateWebhookEvent,
  now: Date = new Date(),
): Promise<"processed" | "duplicate" | "ignored"> {
  if (!event?.id || !event.event) return "ignored";
  const seen = await db.query.webhookEvents.findFirst({ where: eq(webhookEvents.id, event.id) });
  if (seen) return "duplicate";

  const found = event.event.startsWith("transparent.") ? await findPaymentForEvent(db, event.data) : null;
  if (found) {
    const { payment, chargeId } = found;
    switch (event.event) {
      case "transparent.completed":
        await refreshPixPayment(db, billing, payment.id, { now });
        break;
      case "transparent.refunded":
      case "transparent.lost": {
        const status = await remoteStatus(requireGateway(billing.gateway), chargeId);
        if (status === "PAID" || status === "APPROVED" || status === "PENDING") break;
        await db
          .update(payments)
          .set({
            status: "refunded",
            failureReason: event.event === "transparent.lost" ? "Contestação perdida (chargeback)." : null,
          })
          .where(eq(payments.id, payment.id));
        if (payment.subscriptionId) await endSubscriptionNow(db, payment.subscriptionId, now);
        break;
      }
      case "transparent.disputed": {
        const status = await remoteStatus(requireGateway(billing.gateway), chargeId);
        if (status === "PAID" || status === "APPROVED" || status === "PENDING") break;
        await db.update(payments).set({ status: "disputed" }).where(eq(payments.id, payment.id));
        if (payment.subscriptionId) {
          await db
            .update(subscriptions)
            .set({ cancelAtPeriodEnd: true, cancelledAt: now, nextChargeAt: null })
            .where(
              and(
                eq(subscriptions.id, payment.subscriptionId),
                inArray(subscriptions.status, ["active", "past_due"]),
              ),
            );
        }
        break;
      }
      default:
        break;
    }
  }

  // Registrado só depois de processar: se falhar, o AbacatePay reenvia.
  await db
    .insert(webhookEvents)
    .values({ id: event.id, provider: "abacatepay", event: event.event, receivedAt: now })
    .onConflictDoNothing();
  return "processed";
}
