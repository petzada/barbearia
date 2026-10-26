import { and, asc, desc, eq, gte, inArray, isNotNull, lte, ne, sql } from "drizzle-orm";
import type { Db } from "../db";
import {
  paymentMethods,
  payments,
  plans,
  scheduleEntries,
  subscriptions,
  user,
  type SubscriptionPaymentMethod,
} from "../db/schema";
import { assertAdmin, type Actor } from "../actor";
import { DomainError } from "../errors";
import { assertAcceptedTerms } from "../terms";
import { isPhoneTempEmail } from "../auth/config";
import { createWhatsappGateway, sendBillingNotice, type WhatsappGateway } from "../whatsapp/service";
import type { ServerEnv } from "../env";
import { AbacatePayError, type CardCharge, type CardCustomer, type PaymentGateway } from "./abacatepay";
import { addCycle, createPaymentGateway, requireGateway } from "./common";
import { normalizeCpf } from "@/lib/cpf";
import { formatBrazilPhone, normalizeBrazilPhone } from "@/lib/phone";
import { formatPriceCents } from "@/lib/agenda/availability";
import { formatDayMonth } from "@/lib/agenda/format";
import {
  BILLING_GRACE_MS,
  CARD_RETRY_MS,
  MAX_CARD_ATTEMPTS,
  PIX_RENEWAL_LEAD_MS,
  canChangeCard,
  graceEndOf,
} from "@/lib/club-billing";

/**
 * Assinaturas do Clube gerenciadas pelo nosso servidor (sem produto/assinatura
 * no AbacatePay): cartão pelo checkout transparente (token salvo para as
 * renovações) ou Pix com QR a cada ciclo. O cron de hora em hora
 * (`runSubscriptionBilling`) cobra, tenta de novo, envia o Pix e encerra.
 *
 * Toda tentativa de cobrança grava ANTES uma linha em `payments` com chave de
 * idempotência única: duas execuções do cron nunca cobram o mesmo ciclo duas
 * vezes, e uma resposta perdida (timeout) é conciliada depois pela listagem
 * de cobranças (metadata.paymentId) em vez de cobrar de novo.
 */

export type Subscription = typeof subscriptions.$inferSelect;
type Plan = typeof plans.$inferSelect;
type Payment = typeof payments.$inferSelect;

export type BillingDeps = {
  gateway: PaymentGateway | null;
  whatsapp?: WhatsappGateway | null;
  appBaseUrl?: string;
};

export function createBillingDeps(env: ServerEnv): BillingDeps {
  return {
    gateway: createPaymentGateway(env),
    whatsapp: createWhatsappGateway(env),
    appBaseUrl: env.appBaseUrl,
  };
}

/** Sem resposta do AbacatePay por este tempo e sem cobrança na listagem: falhou. */
const UNKNOWN_RESULT_TIMEOUT_MS = 10 * 60_000;
const FIRST_PIX_EXPIRES_IN_SECONDS = 30 * 60;
const MIN_PIX_EXPIRES_IN_SECONDS = 300;

const CARD_REFUSED_MESSAGE = "Pagamento recusado pelo cartão. Confira os dados ou use outro cartão.";
const PENDING_MESSAGE = "Estamos confirmando o pagamento com a operadora. Isso pode levar alguns minutos.";

// ---------------------------------------------------------------------------
// Consulta
// ---------------------------------------------------------------------------

type VigencySnapshot = Pick<Subscription, "status" | "currentPeriodEnd" | "paymentMethod" | "cancelAtPeriodEnd">;

/** Renova sozinha (cartão ou Pix) e não foi cancelada. */
const isRenewing = (sub: VigencySnapshot) =>
  (sub.paymentMethod === "CARD" || sub.paymentMethod === "PIX") && !sub.cancelAtPeriodEnd;

/** Dá acesso agora: ativa no período, ou pagamento pendente dentro da carência. */
export function isSubscriptionCurrent(sub: VigencySnapshot, now: Date): boolean {
  if (!sub.currentPeriodEnd) return false;
  if (sub.status !== "active" && sub.status !== "past_due") return false;
  if (now < sub.currentPeriodEnd) return true;
  if (sub.status === "past_due") return now < graceEndOf(sub.currentPeriodEnd);
  // Ativa vencida que o cron ainda não processou (renovação em andamento).
  return isRenewing(sub) && now < graceEndOf(sub.currentPeriodEnd);
}

/** Assinatura vigente (ativa ou com pagamento pendente na carência) com o plano. */
export async function getActiveSubscription(
  db: Db,
  userId: string,
  now: Date = new Date(),
): Promise<(Subscription & { plan: Plan }) | null> {
  const rows = await db
    .select({ subscription: subscriptions, plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(
      and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.status, ["active", "past_due"]),
        gte(subscriptions.currentPeriodEnd, new Date(now.getTime() - BILLING_GRACE_MS)),
      ),
    )
    .orderBy(desc(subscriptions.currentPeriodEnd));
  const row = rows.find((r) => isSubscriptionCurrent(r.subscription, now));
  return row ? { ...row.subscription, plan: row.plan } : null;
}

export type MemberSubscription = Subscription & {
  plan: Plan;
  card: { brand: string | null; lastFour: string | null } | null;
  /** Pix da renovação aguardando pagamento (link "Pagar Pix"). */
  pendingPixPaymentId: string | null;
  canChangeCard: boolean;
};

/** Dados do cartão de membro (/clube). */
export async function getMemberSubscription(
  db: Db,
  userId: string,
  now: Date = new Date(),
): Promise<MemberSubscription | null> {
  const sub = await getActiveSubscription(db, userId, now);
  if (!sub) return null;
  const card = sub.paymentMethodId
    ? await db.query.paymentMethods.findFirst({
        where: eq(paymentMethods.id, sub.paymentMethodId),
        columns: { brand: true, lastFour: true },
      })
    : null;
  const pendingPix = await db.query.payments.findFirst({
    where: and(
      eq(payments.subscriptionId, sub.id),
      eq(payments.status, "pending"),
      eq(payments.method, "PIX"),
      isNotNull(payments.brCode),
    ),
    orderBy: desc(payments.createdAt),
    columns: { id: true },
  });
  return {
    ...sub,
    card: card ?? null,
    pendingPixPaymentId: pendingPix?.id ?? null,
    canChangeCard: canChangeCard(sub, now),
  };
}

// ---------------------------------------------------------------------------
// Cliente (dados de cobrança)
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type BillingProfileInput = { taxId?: string | null; email?: string | null };

/**
 * Dados do pagador exigidos pelo AbacatePay no cartão: nome, e-mail, CPF e
 * celular. CPF/e-mail informados agora ficam salvos na conta.
 */
async function resolveBillingCustomer(
  db: Db,
  userId: string,
  input: BillingProfileInput = {},
): Promise<CardCustomer> {
  const row = await db.query.user.findFirst({ where: eq(user.id, userId) });
  if (!row) throw new DomainError("not_found", "Conta não encontrada.");

  const rawTaxId = input.taxId?.trim() ? input.taxId : row.taxId;
  const taxId = normalizeCpf(rawTaxId);
  if (!taxId) throw new DomainError("invalid", "Informe um CPF válido.");

  const typedEmail = input.email?.trim().toLowerCase() || null;
  if (typedEmail && !EMAIL_REGEX.test(typedEmail)) throw new DomainError("invalid", "Informe um e-mail válido.");
  const email = typedEmail ?? row.billingEmail ?? (isPhoneTempEmail(row.email) ? null : row.email);
  if (!email) throw new DomainError("invalid", "Informe um e-mail para receber os comprovantes.");

  const phone = normalizeBrazilPhone(row.phoneNumber);
  if (!phone.isValid) {
    throw new DomainError("invalid", "Cadastre seu WhatsApp no perfil para assinar com cartão.");
  }

  if (taxId !== row.taxId || (typedEmail && typedEmail !== row.billingEmail)) {
    await db
      .update(user)
      .set({ taxId, ...(typedEmail ? { billingEmail: typedEmail } : {}) })
      .where(eq(user.id, userId));
  }
  return { name: row.name, email, taxId, cellphone: formatBrazilPhone(row.phoneNumber) };
}

// ---------------------------------------------------------------------------
// Execução de cobrança no cartão
// ---------------------------------------------------------------------------

type ChargeOutcome =
  | { kind: "charged"; charge: CardCharge }
  | { kind: "refused"; reason: string }
  | { kind: "unknown"; reason: string };

/** Recusa = 4xx da API. Timeout, rede e 5xx = resultado desconhecido (nunca recobrar às cegas). */
function classifyChargeError(error: unknown): ChargeOutcome {
  if (
    error instanceof AbacatePayError &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429
  ) {
    return { kind: "refused", reason: error.message.slice(0, 300) };
  }
  const message = error instanceof Error ? error.message : "Falha de comunicação.";
  return { kind: "unknown", reason: message.slice(0, 300) };
}

async function executeCardCharge(
  db: Db,
  gateway: PaymentGateway,
  payment: Payment,
  source: { token: string } | { cardToken: string },
  customer: CardCustomer,
): Promise<ChargeOutcome> {
  let charge: CardCharge;
  try {
    charge = await gateway.createCardCharge({
      amountCents: payment.amountCents,
      ...source,
      customer,
      metadata: { paymentId: payment.id, subscriptionId: payment.subscriptionId ?? "" },
    });
  } catch (error) {
    return classifyChargeError(error);
  }
  await db
    .update(payments)
    .set({
      providerId: charge.id,
      cardBrand: charge.brand,
      cardLastFour: charge.lastFour,
      devMode: charge.devMode,
    })
    .where(eq(payments.id, payment.id));
  return { kind: "charged", charge };
}

/** Salva o cartão (token permanente) e passa a usá-lo nas renovações. */
async function saveCardOnFile(db: Db, sub: Subscription, charge: CardCharge, consentAt: Date) {
  if (!charge.cardToken) return;
  const [method] = await db
    .insert(paymentMethods)
    .values({
      userId: sub.userId,
      cardToken: charge.cardToken,
      brand: charge.brand,
      lastFour: charge.lastFour,
      consentAt,
      devMode: charge.devMode,
      createdAt: consentAt,
    })
    .returning({ id: paymentMethods.id });
  await db.batch([
    db
      .update(paymentMethods)
      .set({ active: false })
      .where(and(eq(paymentMethods.userId, sub.userId), ne(paymentMethods.id, method.id))),
    db
      .update(subscriptions)
      .set({ paymentMethodId: method.id, paymentMethod: "CARD" })
      .where(eq(subscriptions.id, sub.id)),
  ]);
}

/** Aplica o status remoto da cobrança no cartão. */
async function applyCardStatus(db: Db, deps: BillingDeps, payment: Payment, charge: CardCharge, now: Date) {
  switch (charge.status) {
    case "APPROVED":
    case "PAID":
      await markSubscriptionPaymentPaid(db, deps, payment.id, now);
      break;
    case "FAILED":
    case "CANCELLED":
    case "EXPIRED":
      await markSubscriptionPaymentFailed(db, deps, payment.id, "Cobrança recusada pelo cartão.", now);
      break;
    case "REFUNDED":
      await db
        .update(payments)
        .set({ status: "refunded" })
        .where(and(eq(payments.id, payment.id), eq(payments.status, "pending")));
      break;
    default:
      // PENDING (ex.: análise da operadora): o webhook ou o próximo cron confirma.
      break;
  }
}

// ---------------------------------------------------------------------------
// Pagou / falhou
// ---------------------------------------------------------------------------

function nextChargeAtFor(method: SubscriptionPaymentMethod | null, periodEnd: Date): Date | null {
  if (method === "CARD") return periodEnd;
  if (method === "PIX") return new Date(periodEnd.getTime() - PIX_RENEWAL_LEAD_MS);
  return null;
}

/**
 * Pagamento confirmado: ativa (1º pagamento) ou estende a partir do fim do
 * período pago (renovação, mesmo paga atrasada na carência). Idempotente: só
 * a transição pending → paid aplica o ciclo.
 */
export async function markSubscriptionPaymentPaid(
  db: Db,
  deps: BillingDeps,
  paymentId: string,
  paidAt: Date,
): Promise<boolean> {
  const [payment] = await db
    .update(payments)
    .set({ status: "paid", paidAt })
    .where(and(eq(payments.id, paymentId), eq(payments.status, "pending")))
    .returning();
  if (!payment?.subscriptionId) return false;
  const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, payment.subscriptionId) });
  const plan = sub && (await db.query.plans.findFirst({ where: eq(plans.id, sub.planId) }));
  if (!sub || !plan) return false;

  let start: Date;
  if ((sub.status === "active" || sub.status === "past_due") && sub.currentPeriodEnd) {
    start = sub.currentPeriodEnd;
  } else {
    // 1º pagamento, ou pagamento que chegou depois de encerrar (reativa se não houver outra).
    const other = await getActiveSubscription(db, sub.userId, paidAt);
    if (other && other.id !== sub.id) {
      await db
        .update(payments)
        .set({ failureReason: "Pago com outra assinatura vigente: avalie o estorno." })
        .where(eq(payments.id, payment.id));
      return true;
    }
    start = paidAt;
  }
  const end = addCycle(start, plan.cycle);
  const method = sub.paymentMethod ?? (payment.method === "PIX" || payment.method === "CARD" ? payment.method : "MANUAL");

  await db.batch([
    // Uma assinatura 'active' vencida sairia do caminho do índice único.
    db
      .update(subscriptions)
      .set({ status: "expired", nextChargeAt: null })
      .where(
        and(
          eq(subscriptions.userId, sub.userId),
          inArray(subscriptions.status, ["active", "past_due"]),
          ne(subscriptions.id, sub.id),
        ),
      ),
    db
      .update(subscriptions)
      .set({
        status: "active",
        paymentMethod: method,
        method: sub.method ?? payment.method,
        startedAt: sub.startedAt ?? paidAt,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        nextChargeAt: nextChargeAtFor(method, end),
        retryCount: 0,
        pastDueSince: null,
        lastChargeError: null,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      })
      .where(eq(subscriptions.id, sub.id)),
    db.update(payments).set({ cycleStart: start }).where(eq(payments.id, payment.id)),
    // Pix da renovação que ficou para trás (pagou no cartão ou no balcão).
    db
      .update(payments)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(payments.subscriptionId, sub.id),
          eq(payments.status, "pending"),
          eq(payments.method, "PIX"),
          ne(payments.id, payment.id),
        ),
      ),
  ]);
  return true;
}

/** Cobrança falhou: 1º pagamento encerra a tentativa; renovação no cartão entra em atraso. */
export async function markSubscriptionPaymentFailed(
  db: Db,
  deps: BillingDeps,
  paymentId: string,
  reason: string,
  now: Date,
): Promise<boolean> {
  const [payment] = await db
    .update(payments)
    .set({ status: "failed", failureReason: reason })
    .where(and(eq(payments.id, paymentId), eq(payments.status, "pending")))
    .returning();
  if (!payment?.subscriptionId) return false;
  const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, payment.subscriptionId) });
  if (!sub) return true;

  if (sub.status === "pending") {
    await db
      .update(subscriptions)
      .set({ status: "expired", lastChargeError: reason })
      .where(and(eq(subscriptions.id, sub.id), eq(subscriptions.status, "pending")));
    return true;
  }
  // Troca de cartão (attempt nulo) não mexe no agendamento de cobranças.
  if (payment.method !== "CARD" || payment.attempt == null) return true;
  const cycleStart = payment.cycleStart;
  if (!cycleStart || sub.currentPeriodEnd?.getTime() !== cycleStart.getTime()) return true;
  if (sub.status !== "active" && sub.status !== "past_due") return true;
  if (now < cycleStart) {
    // Cobrança antecipada ("Cobrar agora") que falhou: a renovação segue no vencimento.
    await db.update(subscriptions).set({ lastChargeError: reason }).where(eq(subscriptions.id, sub.id));
    return true;
  }

  const attempt = payment.attempt;
  const graceEnd = graceEndOf(cycleStart);
  const retryAt = new Date(Math.max(cycleStart.getTime() + attempt * CARD_RETRY_MS, now.getTime()));
  const nextChargeAt = attempt >= MAX_CARD_ATTEMPTS || retryAt >= graceEnd ? null : retryAt;
  await db
    .update(subscriptions)
    .set({
      status: "past_due",
      pastDueSince: sub.pastDueSince ?? cycleStart,
      retryCount: attempt,
      lastChargeError: reason,
      nextChargeAt,
    })
    .where(eq(subscriptions.id, sub.id));

  const [owner, plan] = await Promise.all([
    db.query.user.findFirst({ where: eq(user.id, sub.userId), columns: { name: true, phoneNumber: true } }),
    db.query.plans.findFirst({ where: eq(plans.id, sub.planId), columns: { name: true } }),
  ]);
  const card = payment.cardLastFour ? ` final ${payment.cardLastFour}` : "";
  const retry = nextChargeAt ? " Vamos tentar de novo em 24 horas." : "";
  const text =
    `Olá, ${firstName(owner?.name)}! Não conseguimos cobrar a renovação do Clube ${plan?.name ?? ""} no cartão${card}.` +
    `${retry} Seu acesso continua até ${formatDayMonth(graceEnd)}. ` +
    `Para não perder os benefícios, atualize o cartão: ${deps.appBaseUrl ?? ""}/clube/cartao`;
  await sendBillingNotice(db, deps.whatsapp ?? null, {
    to: owner?.phoneNumber ?? null,
    text,
    dedupeKey: `billing:card:${sub.id}:${cycleStart.getTime()}:${attempt}`,
  });
  return true;
}

const firstName = (name: string | null | undefined) => (name ?? "").trim().split(/\s+/)[0] || "tudo bem";

// ---------------------------------------------------------------------------
// Adesão
// ---------------------------------------------------------------------------

async function prepareSubscription(
  db: Db,
  actor: Actor,
  gateway: PaymentGateway | null,
  planId: string,
  method: "CARD" | "PIX",
  now: Date,
) {
  const client = requireGateway(gateway);
  await assertAcceptedTerms(db, actor.id);
  if (await getActiveSubscription(db, actor.id, now)) {
    throw new DomainError("invalid", "Você já tem uma assinatura ativa.");
  }
  const plan = await db.query.plans.findFirst({ where: eq(plans.id, planId) });
  if (!plan?.active) throw new DomainError("not_found", "Plano indisponível.");
  if (plan.priceCents < 100) throw new DomainError("invalid", "Valor abaixo do mínimo para pagamento online.");

  // Tentativas abandonadas não acumulam.
  await db
    .update(subscriptions)
    .set({ status: "expired" })
    .where(and(eq(subscriptions.userId, actor.id), eq(subscriptions.status, "pending")));

  const [sub] = await db
    .insert(subscriptions)
    .values({
      userId: actor.id,
      planId: plan.id,
      status: "pending",
      provider: "abacatepay",
      method,
      paymentMethod: method,
      priceCents: plan.priceCents,
      createdAt: now,
    })
    .returning();
  const [payment] = await db
    .insert(payments)
    .values({
      userId: actor.id,
      kind: "subscription",
      subscriptionId: sub.id,
      provider: "abacatepay",
      method,
      amountCents: plan.priceCents,
      status: "pending",
      idempotencyKey: `sub:${sub.id}:first`,
      attempt: 1,
      createdAt: now,
    })
    .returning();
  return { client, plan, sub, payment };
}

export type SubscribeResult = {
  subscriptionId: string;
  paymentId: string;
  status: "active" | "pending";
};

/**
 * Assinar no cartão: o navegador tokeniza com o abacatepay.js (`ctok_`, uso
 * único) e aqui cobramos o 1º ciclo. Aprovado → ativa e salva o cartão para
 * as renovações (com o consentimento registrado).
 */
export async function subscribeWithCard(
  db: Db,
  actor: Actor,
  deps: BillingDeps,
  input: { planId: string; token: string; consent: boolean } & BillingProfileInput,
  now: Date = new Date(),
): Promise<SubscribeResult> {
  if (input.consent !== true) {
    throw new DomainError("invalid", "Autorize as cobranças mensais no cartão para continuar.");
  }
  if (!input.token?.startsWith("ctok_")) throw new DomainError("invalid", "Dados do cartão inválidos. Tente de novo.");
  requireGateway(deps.gateway);
  const customer = await resolveBillingCustomer(db, actor.id, input);
  const { client, sub, payment } = await prepareSubscription(db, actor, deps.gateway, input.planId, "CARD", now);

  const outcome = await executeCardCharge(db, client, payment, { token: input.token }, customer);
  if (outcome.kind === "refused") {
    await markSubscriptionPaymentFailed(db, deps, payment.id, outcome.reason, now);
    throw new DomainError("provider", CARD_REFUSED_MESSAGE);
  }
  if (outcome.kind === "unknown") {
    return { subscriptionId: sub.id, paymentId: payment.id, status: "pending" };
  }
  const { charge } = outcome;
  if (charge.status === "FAILED" || charge.status === "CANCELLED" || charge.status === "EXPIRED") {
    await markSubscriptionPaymentFailed(db, deps, payment.id, "Cobrança recusada pelo cartão.", now);
    throw new DomainError("provider", CARD_REFUSED_MESSAGE);
  }
  await saveCardOnFile(db, sub, charge, now);
  await applyCardStatus(db, deps, payment, charge, now);
  const fresh = await db.query.payments.findFirst({ where: eq(payments.id, payment.id) });
  return { subscriptionId: sub.id, paymentId: payment.id, status: fresh?.status === "paid" ? "active" : "pending" };
}

/** Assinar no Pix: QR do 1º ciclo; as renovações chegam no WhatsApp 3 dias antes. */
export async function subscribeWithPix(
  db: Db,
  actor: Actor,
  deps: BillingDeps,
  input: { planId: string },
  now: Date = new Date(),
): Promise<SubscribeResult> {
  const { client, plan, sub, payment } = await prepareSubscription(db, actor, deps.gateway, input.planId, "PIX", now);
  try {
    const charge = await client.createPixCharge({
      amountCents: payment.amountCents,
      description: `Barbearia do Moura - Clube ${plan.name}`,
      expiresInSeconds: FIRST_PIX_EXPIRES_IN_SECONDS,
      externalId: payment.id,
      metadata: { paymentId: payment.id, subscriptionId: sub.id },
    });
    await db
      .update(payments)
      .set({
        providerId: charge.id,
        brCode: charge.brCode,
        brCodeBase64: charge.brCodeBase64,
        expiresAt: charge.expiresAt
          ? new Date(charge.expiresAt)
          : new Date(now.getTime() + FIRST_PIX_EXPIRES_IN_SECONDS * 1000),
        devMode: charge.devMode,
      })
      .where(eq(payments.id, payment.id));
  } catch (error) {
    await db.batch([
      db.update(payments).set({ status: "cancelled", failureReason: "Pix não gerado." }).where(eq(payments.id, payment.id)),
      db.update(subscriptions).set({ status: "expired" }).where(eq(subscriptions.id, sub.id)),
    ]);
    console.error("[clube] falha ao gerar Pix da adesão", error);
    throw new DomainError("provider", "Não foi possível gerar o Pix agora. Tente de novo em instantes.");
  }
  return { subscriptionId: sub.id, paymentId: payment.id, status: "pending" };
}

// ---------------------------------------------------------------------------
// Consulta do status (polling, webhook e cron)
// ---------------------------------------------------------------------------

/** Concilia uma tentativa sem resposta: procura a cobrança pela metadata. */
async function reconcileUnknownCardPayment(
  db: Db,
  deps: BillingDeps,
  payment: Payment,
  now: Date,
  listed?: CardCharge[],
) {
  const charges = listed ?? (await requireGateway(deps.gateway).listCardCharges());
  const charge = charges.find((c) => c.metadata?.paymentId === payment.id);
  if (charge) {
    await db
      .update(payments)
      .set({ providerId: charge.id, cardBrand: charge.brand, cardLastFour: charge.lastFour, devMode: charge.devMode })
      .where(eq(payments.id, payment.id));
    if (charge.cardToken && payment.subscriptionId) {
      const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, payment.subscriptionId) });
      if (sub?.status === "pending") await saveCardOnFile(db, sub, charge, payment.createdAt);
    }
    await applyCardStatus(db, deps, payment, charge, now);
    return;
  }
  if (now.getTime() - payment.createdAt.getTime() >= UNKNOWN_RESULT_TIMEOUT_MS) {
    await markSubscriptionPaymentFailed(db, deps, payment.id, "Sem confirmação do AbacatePay.", now);
  }
}

/**
 * Sincroniza um pagamento do clube com o AbacatePay (nunca confia só no
 * payload do webhook). Usado pelo polling das telas, pelo webhook e pelo cron.
 */
export async function refreshSubscriptionPayment(
  db: Db,
  deps: BillingDeps,
  paymentId: string,
  opts: { actor?: Actor; now?: Date; listed?: CardCharge[] } = {},
): Promise<Payment> {
  const payment = await db.query.payments.findFirst({ where: eq(payments.id, paymentId) });
  if (
    !payment ||
    payment.kind !== "subscription" ||
    (opts.actor && payment.userId !== opts.actor.id && !opts.actor.isAdmin)
  ) {
    throw new DomainError("not_found", "Pagamento não encontrado.");
  }
  if (payment.status !== "pending" || payment.provider !== "abacatepay") return payment;
  const now = opts.now ?? new Date();
  const gateway = requireGateway(deps.gateway);

  if (!payment.providerId) {
    if (payment.method === "CARD") await reconcileUnknownCardPayment(db, deps, payment, now, opts.listed);
  } else if (payment.providerId.startsWith("pix_char_")) {
    const remote = await gateway.checkPixCharge(payment.providerId);
    if (remote.status === "PAID" || remote.status === "APPROVED") {
      await markSubscriptionPaymentPaid(db, deps, payment.id, now);
    } else if (remote.status === "EXPIRED" || remote.status === "CANCELLED" || remote.status === "FAILED") {
      await markSubscriptionPaymentFailed(db, deps, payment.id, "Pix não pago.", now);
      await db
        .update(payments)
        .set({ status: remote.status === "EXPIRED" ? "expired" : "cancelled" })
        .where(eq(payments.id, payment.id));
    }
  } else {
    await applyCardStatus(db, deps, payment, await gateway.getCardCharge(payment.providerId), now);
  }
  return (await db.query.payments.findFirst({ where: eq(payments.id, paymentId) }))!;
}

// ---------------------------------------------------------------------------
// Renovações
// ---------------------------------------------------------------------------

/** Gera o Pix da renovação (uma vez por ciclo) e envia o link no WhatsApp. */
async function createRenewalPix(
  db: Db,
  deps: BillingDeps,
  sub: Subscription,
  plan: Plan,
  now: Date,
): Promise<"created" | "exists"> {
  const gateway = requireGateway(deps.gateway);
  const cycleStart = sub.currentPeriodEnd!;
  const graceEnd = graceEndOf(cycleStart);
  const [payment] = await db
    .insert(payments)
    .values({
      userId: sub.userId,
      kind: "subscription",
      subscriptionId: sub.id,
      provider: "abacatepay",
      method: "PIX",
      amountCents: sub.priceCents ?? plan.priceCents,
      status: "pending",
      idempotencyKey: `sub:${sub.id}:${cycleStart.getTime()}:pix`,
      cycleStart,
      attempt: 1,
      createdAt: now,
    })
    .onConflictDoNothing({ target: payments.idempotencyKey })
    .returning();
  if (!payment) {
    await db.update(subscriptions).set({ nextChargeAt: null }).where(eq(subscriptions.id, sub.id));
    return "exists";
  }
  try {
    const expiresInSeconds = Math.max(
      MIN_PIX_EXPIRES_IN_SECONDS,
      Math.floor((graceEnd.getTime() - now.getTime()) / 1000),
    );
    const charge = await gateway.createPixCharge({
      amountCents: payment.amountCents,
      description: `Barbearia do Moura - Clube ${plan.name} (renovação)`,
      expiresInSeconds,
      externalId: payment.id,
      metadata: { paymentId: payment.id, subscriptionId: sub.id },
    });
    await db
      .update(payments)
      .set({
        providerId: charge.id,
        brCode: charge.brCode,
        brCodeBase64: charge.brCodeBase64,
        expiresAt: charge.expiresAt ? new Date(charge.expiresAt) : graceEnd,
        devMode: charge.devMode,
      })
      .where(eq(payments.id, payment.id));
  } catch (error) {
    // Gerar Pix não move dinheiro: apaga a tentativa e o próximo cron tenta de novo.
    await db.delete(payments).where(eq(payments.id, payment.id));
    throw error;
  }
  await db.update(subscriptions).set({ nextChargeAt: null }).where(eq(subscriptions.id, sub.id));

  const owner = await db.query.user.findFirst({
    where: eq(user.id, sub.userId),
    columns: { name: true, phoneNumber: true },
  });
  const text =
    `Olá, ${firstName(owner?.name)}! Seu Clube ${plan.name} renova em ${formatDayMonth(cycleStart)}. ` +
    `Pague o Pix de ${formatPriceCents(payment.amountCents)} até ${formatDayMonth(graceEnd)} para continuar com os benefícios: ` +
    `${deps.appBaseUrl ?? ""}/clube/pagar/${payment.id}`;
  await sendBillingNotice(db, deps.whatsapp ?? null, {
    to: owner?.phoneNumber ?? null,
    text,
    dedupeKey: `billing:pix:${sub.id}:${cycleStart.getTime()}`,
  });
  return "created";
}

export type RenewalChargeResult = { status: "paid" | "pending" | "failed" | "in_flight"; message: string | null };

/**
 * Cobra o próximo ciclo no cartão salvo. Agendada: chave
 * `sub:<id>:<fim do período>:<tentativa>` (o cron nunca repete a mesma).
 */
async function chargeRenewal(
  db: Db,
  deps: BillingDeps,
  sub: Subscription,
  plan: Plan,
  now: Date,
  opts: { manual?: boolean } = {},
): Promise<RenewalChargeResult> {
  const gateway = requireGateway(deps.gateway);
  const cycleStart = sub.currentPeriodEnd!;
  const attempt = sub.retryCount + 1;
  const key = opts.manual
    ? `sub:${sub.id}:${cycleStart.getTime()}:manual:${crypto.randomUUID()}`
    : `sub:${sub.id}:${cycleStart.getTime()}:${attempt}`;
  const card = sub.paymentMethodId
    ? await db.query.paymentMethods.findFirst({
        where: and(eq(paymentMethods.id, sub.paymentMethodId), eq(paymentMethods.active, true)),
      })
    : null;

  const [payment] = await db
    .insert(payments)
    .values({
      userId: sub.userId,
      kind: "subscription",
      subscriptionId: sub.id,
      provider: "abacatepay",
      method: "CARD",
      amountCents: sub.priceCents ?? plan.priceCents,
      status: "pending",
      idempotencyKey: key,
      cycleStart,
      attempt,
      cardBrand: card?.brand ?? null,
      cardLastFour: card?.lastFour ?? null,
      createdAt: now,
    })
    .onConflictDoNothing({ target: payments.idempotencyKey })
    .returning();
  // Já existe esta tentativa (outra execução ou resposta perdida): a conciliação resolve.
  if (!payment) return { status: "in_flight", message: PENDING_MESSAGE };

  if (!card) {
    await markSubscriptionPaymentFailed(db, deps, payment.id, "Nenhum cartão salvo.", now);
    return { status: "failed", message: "Nenhum cartão salvo para esta assinatura." };
  }
  let customer: CardCustomer;
  try {
    customer = await resolveBillingCustomer(db, sub.userId);
  } catch (error) {
    const reason = error instanceof DomainError ? error.message : "Dados do cliente incompletos.";
    await markSubscriptionPaymentFailed(db, deps, payment.id, reason, now);
    return { status: "failed", message: reason };
  }

  const outcome = await executeCardCharge(db, gateway, payment, { cardToken: card.cardToken }, customer);
  if (outcome.kind === "refused") {
    await markSubscriptionPaymentFailed(db, deps, payment.id, outcome.reason, now);
    return { status: "failed", message: CARD_REFUSED_MESSAGE };
  }
  if (outcome.kind === "unknown") return { status: "pending", message: PENDING_MESSAGE };
  await applyCardStatus(db, deps, payment, outcome.charge, now);
  const fresh = (await db.query.payments.findFirst({ where: eq(payments.id, payment.id) }))!;
  if (fresh.status === "paid") return { status: "paid", message: null };
  if (fresh.status === "failed") return { status: "failed", message: CARD_REFUSED_MESSAGE };
  return { status: "pending", message: PENDING_MESSAGE };
}

/** Agendamentos futuros cobertos pelo clube voltam a "pagar na barbearia". */
async function releaseCoveredEntries(db: Db, userId: string, from: Date) {
  await db
    .update(scheduleEntries)
    .set({ paymentMethod: "local", paymentStatus: "unpaid" })
    .where(
      and(
        eq(scheduleEntries.clientId, userId),
        eq(scheduleEntries.paymentMethod, "subscription"),
        eq(scheduleEntries.status, "booked"),
        gte(scheduleEntries.startsAt, from),
      ),
    );
}

async function endSubscription(
  db: Db,
  sub: Subscription,
  status: "cancelled" | "expired",
  now: Date,
  releaseFrom: Date,
) {
  await db.batch([
    db
      .update(subscriptions)
      .set({
        status,
        nextChargeAt: null,
        cancelAtPeriodEnd: false,
        ...(status === "cancelled" ? { cancelledAt: sub.cancelledAt ?? now } : {}),
      })
      .where(eq(subscriptions.id, sub.id)),
    db
      .update(payments)
      .set({ status: "cancelled" })
      .where(
        and(eq(payments.subscriptionId, sub.id), eq(payments.status, "pending"), eq(payments.method, "PIX")),
      ),
  ]);
  await releaseCoveredEntries(db, sub.userId, releaseFrom);
}

/** Estorno/chargeback: encerra a assinatura na hora (sem novas cobranças). */
export async function endSubscriptionNow(db: Db, subscriptionId: string, now: Date = new Date()) {
  const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, subscriptionId) });
  if (!sub || (sub.status !== "active" && sub.status !== "past_due" && sub.status !== "pending")) return;
  await endSubscription(db, sub, "cancelled", now, now);
}

export type BillingSummary = {
  reconciled: number;
  charged: number;
  failed: number;
  pixSent: number;
  pastDue: number;
  expired: number;
  cancelled: number;
  errors: number;
};

/**
 * Cobranças do clube — chamado de hora em hora pelo Cron Trigger.
 * Ordem: concilia pendentes → encerra (cancelados, balcão, carência) →
 * Pix em atraso → gera Pix das renovações → cobra cartões.
 */
export async function runSubscriptionBilling(
  db: Db,
  deps: BillingDeps,
  now: Date = new Date(),
): Promise<BillingSummary> {
  const summary: BillingSummary = {
    reconciled: 0,
    charged: 0,
    failed: 0,
    pixSent: 0,
    pastDue: 0,
    expired: 0,
    cancelled: 0,
    errors: 0,
  };
  const safely = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (error) {
      summary.errors += 1;
      console.error(`[clube] cobrança: ${label}`, error);
    }
  };

  // 1. Pendentes (resposta perdida, cartão em análise, Pix sem webhook).
  if (deps.gateway) {
    const pending = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.kind, "subscription"),
          eq(payments.status, "pending"),
          eq(payments.provider, "abacatepay"),
          lte(payments.createdAt, new Date(now.getTime() - 60_000)),
        ),
      )
      .orderBy(asc(payments.createdAt))
      .limit(50);
    let listed: CardCharge[] | undefined;
    for (const payment of pending) {
      await safely(`conciliar ${payment.id}`, async () => {
        if (!payment.providerId && payment.method === "CARD") {
          listed ??= await deps.gateway!.listCardCharges();
        }
        const fresh = await refreshSubscriptionPayment(db, deps, payment.id, { now, listed });
        if (fresh.status !== "pending") summary.reconciled += 1;
      });
    }
  }

  const due = (extra: ReturnType<typeof and>) =>
    db
      .select({ sub: subscriptions, plan: plans })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(extra)
      .limit(200);

  // 2. Cancelados pelo cliente: o acesso termina no fim do período pago.
  for (const { sub } of await due(
    and(
      inArray(subscriptions.status, ["active", "past_due"]),
      eq(subscriptions.cancelAtPeriodEnd, true),
      lte(subscriptions.currentPeriodEnd, now),
    ),
  )) {
    await safely(`cancelar ${sub.id}`, async () => {
      await endSubscription(db, sub, "cancelled", now, sub.currentPeriodEnd!);
      summary.cancelled += 1;
    });
  }

  // 3. Balcão (sem renovação automática) vence no fim do período.
  for (const { sub } of await due(
    and(
      eq(subscriptions.status, "active"),
      sql`coalesce(${subscriptions.paymentMethod}, 'MANUAL') = 'MANUAL'`,
      lte(subscriptions.currentPeriodEnd, now),
    ),
  )) {
    await safely(`vencer ${sub.id}`, async () => {
      await endSubscription(db, sub, "expired", now, sub.currentPeriodEnd!);
      summary.expired += 1;
    });
  }

  // 4. Carência de 3 dias esgotada sem pagamento.
  for (const { sub } of await due(
    and(
      inArray(subscriptions.status, ["active", "past_due"]),
      lte(subscriptions.currentPeriodEnd, new Date(now.getTime() - BILLING_GRACE_MS)),
    ),
  )) {
    await safely(`expirar ${sub.id}`, async () => {
      await endSubscription(db, sub, "expired", now, sub.currentPeriodEnd!);
      summary.expired += 1;
    });
  }

  // 5. Pix não pago até o fim do período: pagamento pendente (carência).
  const pixOverdue = await db
    .update(subscriptions)
    .set({ status: "past_due", pastDueSince: sql`${subscriptions.currentPeriodEnd}` })
    .where(
      and(
        eq(subscriptions.status, "active"),
        eq(subscriptions.paymentMethod, "PIX"),
        lte(subscriptions.currentPeriodEnd, now),
      ),
    )
    .returning({ id: subscriptions.id });
  summary.pastDue += pixOverdue.length;

  if (!deps.gateway) return summary;
  const renewable = (method: "CARD" | "PIX") =>
    due(
      and(
        inArray(subscriptions.status, ["active", "past_due"]),
        eq(subscriptions.paymentMethod, method),
        eq(subscriptions.cancelAtPeriodEnd, false),
        isNotNull(subscriptions.nextChargeAt),
        lte(subscriptions.nextChargeAt, now),
      ),
    );

  // 6. Pix das renovações (3 dias antes do fim).
  for (const { sub, plan } of await renewable("PIX")) {
    await safely(`pix ${sub.id}`, async () => {
      if ((await createRenewalPix(db, deps, sub, plan, now)) === "created") summary.pixSent += 1;
    });
  }

  // 7. Cartões: vencimento e novas tentativas.
  for (const { sub, plan } of await renewable("CARD")) {
    await safely(`cartão ${sub.id}`, async () => {
      const result = await chargeRenewal(db, deps, sub, plan, now);
      if (result.status === "paid") summary.charged += 1;
      if (result.status === "failed") summary.failed += 1;
    });
  }
  return summary;
}

// ---------------------------------------------------------------------------
// Ações do cliente e da gestão
// ---------------------------------------------------------------------------

async function findOwnedSubscription(db: Db, actor: Actor, subscriptionId: string) {
  const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, subscriptionId) });
  if (!sub || (sub.userId !== actor.id && !actor.isAdmin)) {
    throw new DomainError("not_found", "Assinatura não encontrada.");
  }
  return sub;
}

/**
 * Cliente cancela: nada mais é cobrado e o acesso vale até o fim do período
 * pago. Gestão pode encerrar na hora (`immediate`). Em atraso, encerra já.
 */
export async function cancelSubscription(
  db: Db,
  actor: Actor,
  subscriptionId: string,
  opts: { immediate?: boolean } = {},
  now: Date = new Date(),
): Promise<{ endsAt: Date }> {
  const sub = await findOwnedSubscription(db, actor, subscriptionId);
  if (opts.immediate) assertAdmin(actor);
  if (!isSubscriptionCurrent(sub, now)) throw new DomainError("invalid", "Esta assinatura não está ativa.");

  const endsNow = opts.immediate || sub.status === "past_due" || !sub.currentPeriodEnd || sub.currentPeriodEnd <= now;
  if (endsNow) {
    await endSubscription(db, sub, "cancelled", now, now);
    return { endsAt: now };
  }
  await db.batch([
    db
      .update(subscriptions)
      .set({ cancelAtPeriodEnd: true, cancelledAt: now, nextChargeAt: null })
      .where(eq(subscriptions.id, sub.id)),
    db
      .update(payments)
      .set({ status: "cancelled" })
      .where(
        and(eq(payments.subscriptionId, sub.id), eq(payments.status, "pending"), eq(payments.method, "PIX")),
      ),
  ]);
  return { endsAt: sub.currentPeriodEnd! };
}

/** Gestão: cobra o próximo ciclo agora (cartão) ou gera/envia o Pix da renovação. */
export async function chargeSubscriptionNow(
  db: Db,
  actor: Actor,
  deps: BillingDeps,
  subscriptionId: string,
  now: Date = new Date(),
): Promise<RenewalChargeResult> {
  assertAdmin(actor);
  requireGateway(deps.gateway);
  const sub = await findOwnedSubscription(db, actor, subscriptionId);
  if (!isSubscriptionCurrent(sub, now)) throw new DomainError("invalid", "Esta assinatura não está ativa.");
  if (sub.cancelAtPeriodEnd) throw new DomainError("invalid", "Assinatura cancelada: não há próxima cobrança.");
  const plan = (await db.query.plans.findFirst({ where: eq(plans.id, sub.planId) }))!;
  if (sub.paymentMethod === "CARD") {
    const result = await chargeRenewal(db, deps, sub, plan, now, { manual: true });
    if (result.status === "failed") throw new DomainError("provider", result.message ?? CARD_REFUSED_MESSAGE);
    return result;
  }
  if (sub.paymentMethod === "PIX") {
    const created = await createRenewalPix(db, deps, sub, plan, now);
    if (created === "exists") throw new DomainError("invalid", "O Pix desta renovação já foi enviado ao cliente.");
    return { status: "pending", message: "Pix da renovação enviado no WhatsApp do cliente." };
  }
  throw new DomainError("invalid", "Assinatura paga no balcão: use “Registrar pagamento”.");
}

/** Gestão: estorna o último pagamento online e encerra a assinatura na hora. */
export async function refundLastSubscriptionPayment(
  db: Db,
  actor: Actor,
  gateway: PaymentGateway | null,
  subscriptionId: string,
  now: Date = new Date(),
): Promise<Payment> {
  assertAdmin(actor);
  const sub = await findOwnedSubscription(db, actor, subscriptionId);
  const last = await db.query.payments.findFirst({
    where: and(
      eq(payments.subscriptionId, sub.id),
      eq(payments.status, "paid"),
      eq(payments.provider, "abacatepay"),
      isNotNull(payments.providerId),
    ),
    orderBy: desc(payments.paidAt),
  });
  if (!last?.providerId) throw new DomainError("invalid", "Não há pagamento online para estornar.");
  await requireGateway(gateway).refund(last.providerId, "Estorno solicitado pela barbearia");
  await db.update(payments).set({ status: "refunded" }).where(eq(payments.id, last.id));
  if (sub.status === "active" || sub.status === "past_due") {
    await endSubscription(db, sub, "cancelled", now, now);
  }
  return (await db.query.payments.findFirst({ where: eq(payments.id, last.id) }))!;
}

/**
 * Trocar cartão (pagamento pendente ou até 3 dias antes da renovação): cobra
 * o próximo ciclo no cartão novo, salva-o e estende a partir do fim do período.
 */
export async function changeSubscriptionCard(
  db: Db,
  actor: Actor,
  deps: BillingDeps,
  input: { token: string; consent: boolean } & BillingProfileInput,
  now: Date = new Date(),
): Promise<{ status: "paid" | "pending"; paymentId: string }> {
  if (input.consent !== true) {
    throw new DomainError("invalid", "Autorize as cobranças mensais no cartão para continuar.");
  }
  if (!input.token?.startsWith("ctok_")) throw new DomainError("invalid", "Dados do cartão inválidos. Tente de novo.");
  const gateway = requireGateway(deps.gateway);
  const sub = await getActiveSubscription(db, actor.id, now);
  if (!sub) throw new DomainError("not_found", "Você não tem assinatura ativa.");
  if (!canChangeCard(sub, now)) {
    throw new DomainError("invalid", "Você poderá trocar o cartão a partir de 3 dias antes da renovação.");
  }
  const customer = await resolveBillingCustomer(db, actor.id, input);
  const cycleStart = sub.currentPeriodEnd!;
  const [payment] = await db
    .insert(payments)
    .values({
      userId: actor.id,
      kind: "subscription",
      subscriptionId: sub.id,
      provider: "abacatepay",
      method: "CARD",
      amountCents: sub.priceCents ?? sub.plan.priceCents,
      status: "pending",
      idempotencyKey: `sub:${sub.id}:${cycleStart.getTime()}:change:${crypto.randomUUID()}`,
      cycleStart,
      createdAt: now,
    })
    .returning();

  const outcome = await executeCardCharge(db, gateway, payment, { token: input.token }, customer);
  if (outcome.kind === "refused") {
    await markSubscriptionPaymentFailed(db, deps, payment.id, outcome.reason, now);
    throw new DomainError("provider", CARD_REFUSED_MESSAGE);
  }
  if (outcome.kind === "unknown") return { status: "pending", paymentId: payment.id };
  const { charge } = outcome;
  if (charge.status === "FAILED" || charge.status === "CANCELLED" || charge.status === "EXPIRED") {
    await markSubscriptionPaymentFailed(db, deps, payment.id, "Cobrança recusada pelo cartão.", now);
    throw new DomainError("provider", CARD_REFUSED_MESSAGE);
  }
  await saveCardOnFile(db, sub, charge, now);
  await applyCardStatus(db, deps, payment, charge, now);
  const fresh = await db.query.payments.findFirst({ where: eq(payments.id, payment.id) });
  return { status: fresh?.status === "paid" ? "paid" : "pending", paymentId: payment.id };
}

/** Admin registra assinatura paga no balcão (sem gateway). Assinante: soma um ciclo. */
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
  let subscriptionId = active?.id;
  if (!subscriptionId) {
    await db
      .update(subscriptions)
      .set({ status: "expired" })
      .where(and(eq(subscriptions.userId, input.userId), eq(subscriptions.status, "pending")));
    const [row] = await db
      .insert(subscriptions)
      .values({
        userId: input.userId,
        planId: plan.id,
        status: "pending",
        provider: "manual",
        method: input.method,
        paymentMethod: "MANUAL",
        priceCents: plan.priceCents,
        createdAt: now,
      })
      .returning();
    subscriptionId = row.id;
  }
  const [payment] = await db
    .insert(payments)
    .values({
      userId: input.userId,
      kind: "subscription",
      subscriptionId,
      provider: "manual",
      method: input.method,
      amountCents: active?.priceCents ?? plan.priceCents,
      status: "pending",
      recordedById: actor.id,
      createdAt: now,
    })
    .returning();
  await markSubscriptionPaymentPaid(db, { gateway: null }, payment.id, now);
  return (await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, subscriptionId) }))!;
}

/** Exclusão de conta: encerra assinaturas e apaga os cartões salvos (sem cobranças futuras). */
export async function closeBillingForUser(db: Db, userId: string, now: Date = new Date()) {
  await db.batch([
    db
      .update(subscriptions)
      .set({ status: "cancelled", cancelledAt: now, nextChargeAt: null, cancelAtPeriodEnd: false })
      .where(and(eq(subscriptions.userId, userId), inArray(subscriptions.status, ["active", "past_due", "pending"]))),
    db.update(subscriptions).set({ paymentMethodId: null }).where(eq(subscriptions.userId, userId)),
    db.delete(paymentMethods).where(eq(paymentMethods.userId, userId)),
    db
      .update(payments)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(payments.userId, userId),
          eq(payments.kind, "subscription"),
          eq(payments.status, "pending"),
          eq(payments.method, "PIX"),
        ),
      ),
  ]);
}
