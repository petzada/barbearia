import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import type { Db } from "../db";
import {
  payments,
  plans,
  scheduleEntries,
  subscriptions,
  user,
  webhookEvents,
  type PlanCycle,
} from "../db/schema";
import { assertAdmin, type Actor } from "../actor";
import { DomainError } from "../errors";
import type { ServerEnv } from "../env";
import {
  AbacatePayClient,
  findIdWithPrefix,
  type AbacateWebhookEvent,
  type PaymentGateway,
} from "./abacatepay";
import { planFormSchema, type PlanFormInput } from "@/lib/validations/plano";

export type Payment = typeof payments.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;

export function createPaymentGateway(env: ServerEnv): PaymentGateway | null {
  return env.abacatePayApiKey ? new AbacatePayClient(env.abacatePayApiKey) : null;
}

function requireGateway(gateway: PaymentGateway | null): PaymentGateway {
  if (!gateway) {
    throw new DomainError(
      "provider",
      "Pagamento online indisponível no momento. Você pode pagar na barbearia.",
    );
  }
  return gateway;
}

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
    description: "Barbearia do Moura — agendamento",
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
 */
export async function refreshPixPayment(
  db: Db,
  gateway: PaymentGateway | null,
  paymentId: string,
  opts: { actor?: Actor; now?: Date } = {},
): Promise<Payment> {
  const payment = await db.query.payments.findFirst({ where: eq(payments.id, paymentId) });
  if (!payment || (opts.actor && payment.userId !== opts.actor.id && !opts.actor.isAdmin)) {
    throw new DomainError("not_found", "Pagamento não encontrado.");
  }
  if (payment.status !== "pending" || !payment.providerId) return payment;

  const now = opts.now ?? new Date();
  const remote = await requireGateway(gateway).checkPixCharge(payment.providerId);
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
  gateway: PaymentGateway | null,
  paymentId: string,
): Promise<Payment> {
  const payment = await db.query.payments.findFirst({ where: eq(payments.id, paymentId) });
  if (!payment || payment.userId !== actor.id) {
    throw new DomainError("not_found", "Pagamento não encontrado.");
  }
  if (!payment.devMode || !payment.providerId) {
    throw new DomainError("invalid", "Simulação disponível só no modo de teste.");
  }
  await requireGateway(gateway).simulatePixPayment(payment.providerId);
  return refreshPixPayment(db, gateway, paymentId, { actor });
}

// ---------------------------------------------------------------------------
// Planos e assinaturas
// ---------------------------------------------------------------------------

export function addCycle(from: Date, cycle: PlanCycle): Date {
  const d = new Date(from.getTime());
  switch (cycle) {
    case "WEEKLY":
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case "MONTHLY":
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
    case "QUARTERLY":
      d.setUTCMonth(d.getUTCMonth() + 3);
      break;
    case "SEMIANNUALLY":
      d.setUTCMonth(d.getUTCMonth() + 6);
      break;
    case "ANNUALLY":
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
  }
  return d;
}

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
    // Preço/ciclo novos exigem um novo produto no AbacatePay.
    const productChanged =
      current.priceCents !== values.priceCents || current.cycle !== values.cycle;
    const [row] = await db
      .update(plans)
      .set({ ...values, ...(productChanged ? { providerProductId: null } : {}) })
      .where(eq(plans.id, id))
      .returning();
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

export async function getActiveSubscription(
  db: Db,
  userId: string,
  now: Date = new Date(),
): Promise<(Subscription & { plan: Plan }) | null> {
  const row = await db
    .select({ subscription: subscriptions, plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
        gt(subscriptions.currentPeriodEnd, now),
      ),
    )
    .get();
  return row ? { ...row.subscription, plan: row.plan } : null;
}

/**
 * Inicia a assinatura: cria (se preciso) o produto recorrente no AbacatePay e
 * devolve a URL do checkout hospedado (cartão ou Pix Automático).
 */
export async function startSubscriptionCheckout(
  db: Db,
  actor: Actor,
  gateway: PaymentGateway | null,
  env: Pick<ServerEnv, "appBaseUrl">,
  planId: string,
  now: Date = new Date(),
): Promise<{ url: string }> {
  const client = requireGateway(gateway);
  if (await getActiveSubscription(db, actor.id, now)) {
    throw new DomainError("invalid", "Você já tem uma assinatura ativa.");
  }
  const plan = await db.query.plans.findFirst({ where: eq(plans.id, planId) });
  if (!plan?.active) throw new DomainError("not_found", "Plano indisponível.");

  let productId = plan.providerProductId;
  if (!productId) {
    const product = await client.createProduct({
      externalId: `plan-${plan.id}-${plan.priceCents}-${plan.cycle}`,
      name: `Clube ${plan.name}`,
      priceCents: plan.priceCents,
      description: plan.description,
      cycle: plan.cycle,
    });
    productId = product.id;
    await db.update(plans).set({ providerProductId: productId }).where(eq(plans.id, plan.id));
  }

  // Checkouts abandonados não acumulam: o pendente anterior é descartado.
  await db
    .update(subscriptions)
    .set({ status: "expired" })
    .where(and(eq(subscriptions.userId, actor.id), eq(subscriptions.status, "pending")));

  const subscriptionId = crypto.randomUUID();
  const checkout = await client.createSubscriptionCheckout({
    productId,
    externalId: subscriptionId,
    returnUrl: `${env.appBaseUrl}/clube`,
    completionUrl: `${env.appBaseUrl}/clube?assinatura=ok`,
    metadata: { subscriptionId, userId: actor.id },
  });
  await db.insert(subscriptions).values({
    id: subscriptionId,
    userId: actor.id,
    planId: plan.id,
    status: "pending",
    provider: "abacatepay",
    providerCheckoutId: checkout.id,
    providerCheckoutUrl: checkout.url,
  });
  return { url: checkout.url };
}

export async function cancelSubscription(
  db: Db,
  actor: Actor,
  gateway: PaymentGateway | null,
  subscriptionId: string,
  now: Date = new Date(),
): Promise<void> {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.id, subscriptionId),
  });
  if (!sub || (sub.userId !== actor.id && !actor.isAdmin)) {
    throw new DomainError("not_found", "Assinatura não encontrada.");
  }
  if (sub.status !== "active") throw new DomainError("invalid", "Esta assinatura não está ativa.");
  if (sub.provider === "abacatepay" && sub.providerSubscriptionId) {
    await requireGateway(gateway).cancelSubscription(sub.providerSubscriptionId);
  }
  await db
    .update(subscriptions)
    .set({ status: "cancelled", cancelledAt: now })
    .where(eq(subscriptions.id, sub.id));
}

/** Admin registra assinatura paga no balcão (pagamento manual, sem gateway). */
export async function grantManualSubscription(
  db: Db,
  actor: Actor,
  input: { userId: string; planId: string; method: string },
  now: Date = new Date(),
): Promise<Subscription> {
  assertAdmin(actor);
  const plan = await db.query.plans.findFirst({ where: eq(plans.id, input.planId) });
  if (!plan) throw new DomainError("not_found", "Plano não encontrado.");
  const client = await db.query.user.findFirst({ where: eq(user.id, input.userId) });
  if (!client) throw new DomainError("not_found", "Cliente não encontrado.");

  const active = await getActiveSubscription(db, input.userId, now);
  if (active && active.planId !== plan.id) {
    throw new DomainError("invalid", "O cliente já tem outra assinatura ativa.");
  }
  const periodStart = active?.currentPeriodEnd && active.currentPeriodEnd > now ? active.currentPeriodEnd : now;
  const periodEnd = addCycle(periodStart, plan.cycle);

  let subscriptionId = active?.id;
  if (active) {
    await db
      .update(subscriptions)
      .set({ currentPeriodEnd: periodEnd })
      .where(eq(subscriptions.id, active.id));
  } else {
    // Assinatura vencida com status 'active' sai do caminho do índice único.
    await db
      .update(subscriptions)
      .set({ status: "expired" })
      .where(and(eq(subscriptions.userId, input.userId), eq(subscriptions.status, "active")));
    const [row] = await db
      .insert(subscriptions)
      .values({
        userId: input.userId,
        planId: plan.id,
        status: "active",
        provider: "manual",
        method: input.method,
        startedAt: now,
        currentPeriodEnd: periodEnd,
      })
      .returning();
    subscriptionId = row.id;
  }
  await db.insert(payments).values({
    userId: input.userId,
    kind: "subscription",
    subscriptionId,
    provider: "manual",
    method: input.method,
    amountCents: plan.priceCents,
    status: "paid",
    paidAt: now,
    recordedById: actor.id,
  });
  return (await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, subscriptionId!) }))!;
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

async function findSubscriptionForEvent(db: Db, data: unknown) {
  const subsId = findIdWithPrefix(data, "subs_");
  const checkoutId = findIdWithPrefix(data, "bill_");
  if (subsId) {
    const bySubs = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.providerSubscriptionId, subsId),
    });
    if (bySubs) return { sub: bySubs, subsId };
  }
  if (checkoutId) {
    const byCheckout = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.providerCheckoutId, checkoutId),
    });
    if (byCheckout) return { sub: byCheckout, subsId };
  }
  return { sub: null, subsId };
}

async function activateOrRenew(
  db: Db,
  gateway: PaymentGateway | null,
  data: unknown,
  eventId: string,
  now: Date,
) {
  const { sub, subsId } = await findSubscriptionForEvent(db, data);
  if (!sub || !subsId) return;
  const remote = await requireGateway(gateway).getSubscription(subsId);
  if (remote.status !== "ACTIVE") return;
  const plan = await db.query.plans.findFirst({ where: eq(plans.id, sub.planId) });
  if (!plan) return;

  const base = sub.currentPeriodEnd && sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
  await db.batch([
    // Se havia outra ativa (ex.: manual), ela é encerrada para valer a nova.
    db
      .update(subscriptions)
      .set({ status: "expired" })
      .where(
        and(
          eq(subscriptions.userId, sub.userId),
          eq(subscriptions.status, "active"),
          sql`${subscriptions.id} <> ${sub.id}`,
        ),
      ),
    db
      .update(subscriptions)
      .set({
        status: "active",
        providerSubscriptionId: subsId,
        method: remote.method ?? sub.method,
        startedAt: sub.startedAt ?? now,
        currentPeriodEnd: addCycle(base, plan.cycle),
      })
      .where(eq(subscriptions.id, sub.id)),
    db
      .insert(payments)
      .values({
        userId: sub.userId,
        kind: "subscription",
        subscriptionId: sub.id,
        provider: "abacatepay",
        method: remote.method ?? "CARD",
        providerId: `evt:${eventId}`,
        amountCents: remote.amount || plan.priceCents,
        status: "paid",
        paidAt: now,
        devMode: remote.devMode,
      })
      .onConflictDoNothing({ target: payments.providerId }),
  ]);
}

export async function handleAbacateWebhook(
  db: Db,
  gateway: PaymentGateway | null,
  event: AbacateWebhookEvent,
  now: Date = new Date(),
): Promise<"processed" | "duplicate" | "ignored"> {
  if (!event?.id || !event.event) return "ignored";
  const seen = await db.query.webhookEvents.findFirst({ where: eq(webhookEvents.id, event.id) });
  if (seen) return "duplicate";

  switch (event.event) {
    case "transparent.completed": {
      const pixId = findIdWithPrefix(event.data, "pix_char_");
      const payment = pixId
        ? await db.query.payments.findFirst({ where: eq(payments.providerId, pixId) })
        : null;
      if (payment) await refreshPixPayment(db, gateway, payment.id, { now });
      break;
    }
    case "subscription.completed":
    case "subscription.renewed":
      await activateOrRenew(db, gateway, event.data, event.id, now);
      break;
    case "subscription.cancelled": {
      const { sub } = await findSubscriptionForEvent(db, event.data);
      if (sub && sub.status === "active") {
        await db
          .update(subscriptions)
          .set({ status: "cancelled", cancelledAt: now })
          .where(eq(subscriptions.id, sub.id));
      }
      break;
    }
    case "transparent.refunded": {
      const pixId = findIdWithPrefix(event.data, "pix_char_");
      if (pixId) {
        await db.update(payments).set({ status: "refunded" }).where(eq(payments.providerId, pixId));
      }
      break;
    }
    default:
      // Evento conhecido mas sem ação aqui: registrado para não reprocessar.
      break;
  }

  // Registrado só depois de processar: se falhar, o AbacatePay reenvia.
  await db
    .insert(webhookEvents)
    .values({ id: event.id, provider: "abacatepay", event: event.event, receivedAt: now })
    .onConflictDoNothing();
  return "processed";
}
