import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/test/d1";
import { createAdmin, createBarber, createUser, sp } from "@/test/factories";
import { fakePaymentGateway, fakeWhatsapp } from "@/test/fake-payments";
import { paymentMethods, payments, plans, scheduleEntries, subscriptions, user, webhookEvents, whatsappLogs } from "../db/schema";
import { createAppointment } from "../scheduling";
import { getClubUsage, getCoverage } from "../club-coverage";
import { addCycle } from "./common";
import { handleAbacateWebhook, refreshPixPayment } from "./service";
import {
  cancelSubscription,
  changeSubscriptionCard,
  chargeSubscriptionNow,
  getActiveSubscription,
  getMemberSubscription,
  refundLastSubscriptionPayment,
  runSubscriptionBilling,
  subscribeWithCard,
  subscribeWithPix,
  type BillingDeps,
} from "./subscriptions";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
beforeEach(() => t.reset());
afterAll(() => t.dispose());

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** Terça-feira. */
const NOW = sp("2026-11-03", "10:00");
const END = addCycle(NOW, "MONTHLY");
const CPF = "529.982.247-25";
const at = (base: Date, ms: number) => new Date(base.getTime() + ms);

async function setup() {
  let clock = NOW;
  const fake = fakePaymentGateway(() => clock);
  const whatsapp = await fakeWhatsapp(t.db);
  const deps: BillingDeps = { gateway: fake.gw, whatsapp: whatsapp.gateway, appBaseUrl: "https://app.test" };
  const client = await createUser(t.db, { phoneNumber: "+5511960001234" });
  const plan = (await t.db.query.plans.findFirst({ where: eq(plans.slug, "premium") }))!;
  const run = (when: Date) => {
    clock = when;
    return runSubscriptionBilling(t.db, deps, when);
  };
  return { fake, whatsapp, deps, client, plan, run, setClock: (d: Date) => (clock = d) };
}

const subOf = async (userId: string) =>
  (await t.db.select().from(subscriptions).where(eq(subscriptions.userId, userId))).at(-1)!;
const paymentsOf = (subscriptionId: string) =>
  t.db.select().from(payments).where(eq(payments.subscriptionId, subscriptionId)).orderBy(payments.createdAt);

async function subscribedWithCard() {
  const ctx = await setup();
  const result = await subscribeWithCard(
    t.db, ctx.client, ctx.deps,
    { planId: ctx.plan.id, token: "ctok_abc", taxId: CPF, consent: true },
    NOW,
  );
  return { ...ctx, result };
}

describe("assinar no cartão", () => {
  it("aprovado: ativa 1 ciclo, salva o cartão com consentimento e agenda a renovação", async () => {
    const { fake, client, plan, result } = await subscribedWithCard();
    expect(result.status).toBe("active");
    expect(fake.gw.createCardCharge).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: plan.priceCents,
        token: "ctok_abc",
        customer: { name: expect.any(String), email: expect.stringContaining("@teste.local"), taxId: "52998224725", cellphone: "(11) 96000-1234" },
        metadata: { paymentId: result.paymentId, subscriptionId: result.subscriptionId },
      }),
    );
    const sub = await subOf(client.id);
    expect(sub).toMatchObject({
      status: "active",
      paymentMethod: "CARD",
      priceCents: plan.priceCents,
      currentPeriodStart: NOW,
      currentPeriodEnd: END,
      nextChargeAt: END,
    });
    const [card] = await t.db.select().from(paymentMethods);
    expect(card).toMatchObject({ userId: client.id, cardToken: "card_tok_1", lastFour: "4242", active: true, consentAt: NOW });
    expect(sub.paymentMethodId).toBe(card.id);
    const [payment] = await paymentsOf(sub.id);
    expect(payment).toMatchObject({ status: "paid", method: "CARD", providerId: "card_1", cardLastFour: "4242", cycleStart: NOW });
    const [row] = await t.db.select().from(user).where(eq(user.id, client.id));
    expect(row.taxId).toBe("52998224725");

    const member = (await getMemberSubscription(t.db, client.id, NOW))!;
    expect(member.card).toEqual({ brand: "VISA", lastFour: "4242" });
    expect(member.canChangeCard).toBe(false);
  });

  it("valida consentimento, CPF e e-mail (cadastro por telefone)", async () => {
    const { deps, plan, fake } = await setup();
    const phoneOnly = await createUser(t.db, { email: "5511960009999@telefone.barbeariadomoura.app", phoneNumber: "+5511960009999" });
    const base = { planId: plan.id, token: "ctok_x", taxId: CPF, consent: true };
    await expect(subscribeWithCard(t.db, phoneOnly, deps, { ...base, consent: false }, NOW)).rejects.toThrow(/Autorize/);
    await expect(subscribeWithCard(t.db, phoneOnly, deps, { ...base, taxId: "111.111.111-11" }, NOW)).rejects.toThrow(/CPF/);
    await expect(subscribeWithCard(t.db, phoneOnly, deps, base, NOW)).rejects.toThrow(/e-mail/);
    expect(fake.gw.createCardCharge).not.toHaveBeenCalled();
    await subscribeWithCard(t.db, phoneOnly, deps, { ...base, email: "Cliente@Email.com" }, NOW);
    expect(fake.gw.createCardCharge).toHaveBeenCalledWith(
      expect.objectContaining({ customer: expect.objectContaining({ email: "cliente@email.com" }) }),
    );
    await expect(subscribeWithCard(t.db, phoneOnly, deps, base, NOW)).rejects.toThrow(/já tem uma assinatura/);
  });

  it("pendente: ativa quando o webhook confirma (sempre reconsultando a API)", async () => {
    const ctx = await setup();
    ctx.fake.queueCard("PENDING");
    const result = await subscribeWithCard(
      t.db, ctx.client, ctx.deps, { planId: ctx.plan.id, token: "ctok_abc", taxId: CPF, consent: true }, NOW,
    );
    expect(result.status).toBe("pending");
    expect(await getActiveSubscription(t.db, ctx.client.id, NOW)).toBeNull();

    const event = { id: "log_1", event: "transparent.completed", data: { transparent: { id: "card_1", status: "APPROVED" } } };
    // O payload diz aprovado, mas a API ainda diz PENDING: nada muda.
    await handleAbacateWebhook(t.db, ctx.deps, { ...event, id: "log_0" }, NOW);
    expect((await subOf(ctx.client.id)).status).toBe("pending");

    ctx.fake.setCard("card_1", "APPROVED");
    expect(await handleAbacateWebhook(t.db, ctx.deps, event, at(NOW, 60_000))).toBe("processed");
    expect(await handleAbacateWebhook(t.db, ctx.deps, event, at(NOW, 60_000))).toBe("duplicate");
    expect(await subOf(ctx.client.id)).toMatchObject({ status: "active", currentPeriodStart: at(NOW, 60_000) });
  });

  it("recusado: mensagem amigável, assinatura não ativa e cartão não salvo", async () => {
    const ctx = await setup();
    ctx.fake.queueCard("REFUSE");
    await expect(
      subscribeWithCard(t.db, ctx.client, ctx.deps, { planId: ctx.plan.id, token: "ctok_abc", taxId: CPF, consent: true }, NOW),
    ).rejects.toMatchObject({ code: "provider", message: expect.stringMatching(/recusado/) });
    const sub = await subOf(ctx.client.id);
    expect(sub.status).toBe("expired");
    expect((await paymentsOf(sub.id))[0]).toMatchObject({ status: "failed", failureReason: "Card declined" });
    expect(await t.db.select().from(paymentMethods)).toHaveLength(0);

    ctx.fake.queueCard("FAILED");
    await expect(
      subscribeWithCard(t.db, ctx.client, ctx.deps, { planId: ctx.plan.id, token: "ctok_def", taxId: CPF, consent: true }, NOW),
    ).rejects.toThrow(/recusado/);
    expect(await getActiveSubscription(t.db, ctx.client.id, NOW)).toBeNull();
  });

  it("resposta perdida (timeout): não recobra; concilia pela listagem e ativa", async () => {
    const ctx = await setup();
    ctx.fake.queueCard("TIMEOUT");
    const result = await subscribeWithCard(
      t.db, ctx.client, ctx.deps, { planId: ctx.plan.id, token: "ctok_abc", taxId: CPF, consent: true }, NOW,
    );
    expect(result.status).toBe("pending");
    const [pending] = await paymentsOf(result.subscriptionId);
    expect(pending).toMatchObject({ status: "pending", providerId: null });

    await ctx.run(at(NOW, 5 * 60_000));
    expect(ctx.fake.gw.createCardCharge).toHaveBeenCalledTimes(1);
    expect(await subOf(ctx.client.id)).toMatchObject({ status: "active", paymentMethod: "CARD" });
    expect((await paymentsOf(result.subscriptionId))[0]).toMatchObject({ status: "paid", providerId: "card_1" });
    expect(await t.db.select().from(paymentMethods)).toHaveLength(1);
  });
});

describe("assinar no Pix", () => {
  it("gera o QR do 1º ciclo e ativa ao pagar; renovação agendada 3 dias antes", async () => {
    const ctx = await setup();
    const result = await subscribeWithPix(t.db, ctx.client, ctx.deps, { planId: ctx.plan.id }, NOW);
    const [payment] = await paymentsOf(result.subscriptionId);
    expect(payment).toMatchObject({ status: "pending", method: "PIX", providerId: "pix_char_1", amountCents: ctx.plan.priceCents });
    expect(payment.brCode).toContain("pix_char_1");

    expect((await refreshPixPayment(t.db, ctx.deps, payment.id, { actor: ctx.client, now: NOW })).status).toBe("pending");
    ctx.fake.setPix("pix_char_1", "PAID");
    expect((await refreshPixPayment(t.db, ctx.deps, payment.id, { actor: ctx.client, now: NOW })).status).toBe("paid");
    expect(await subOf(ctx.client.id)).toMatchObject({
      status: "active",
      paymentMethod: "PIX",
      currentPeriodEnd: END,
      nextChargeAt: at(END, -3 * DAY),
    });
    expect(ctx.fake.gw.createCardCharge).not.toHaveBeenCalled();
  });

  it("Pix da adesão expirado encerra a tentativa", async () => {
    const ctx = await setup();
    const result = await subscribeWithPix(t.db, ctx.client, ctx.deps, { planId: ctx.plan.id }, NOW);
    ctx.fake.setPix("pix_char_1", "EXPIRED");
    const payment = await refreshPixPayment(t.db, ctx.deps, result.paymentId, { now: at(NOW, 31 * 60_000) });
    expect(payment.status).toBe("expired");
    expect((await subOf(ctx.client.id)).status).toBe("expired");
  });
});

describe("renovações no cartão (cron)", () => {
  it("cobra no vencimento com o cartão salvo e estende a partir do fim; não cobra duas vezes", async () => {
    const ctx = await subscribedWithCard();
    expect((await ctx.run(at(END, -HOUR))).charged).toBe(0);
    const summary = await ctx.run(at(END, 30 * 60_000));
    expect(summary.charged).toBe(1);
    expect(ctx.fake.gw.createCardCharge).toHaveBeenLastCalledWith(
      expect.objectContaining({ cardToken: "card_tok_1", amountCents: ctx.plan.priceCents }),
    );
    const sub = await subOf(ctx.client.id);
    expect(sub).toMatchObject({ status: "active", currentPeriodStart: END, currentPeriodEnd: addCycle(END, "MONTHLY"), retryCount: 0 });
    await ctx.run(at(END, 90 * 60_000));
    expect(ctx.fake.gw.createCardCharge).toHaveBeenCalledTimes(2);
    const rows = await paymentsOf(sub.id);
    expect(rows.map((p) => [p.status, p.idempotencyKey])).toEqual([
      ["paid", `sub:${sub.id}:first`],
      ["paid", `sub:${sub.id}:${END.getTime()}:1`],
    ]);
  });

  it("recusa → pagamento pendente → nova tentativa em 24h → encerra após 3 dias", async () => {
    const ctx = await subscribedWithCard();
    ctx.fake.queueCard("REFUSE", "REFUSE", "REFUSE");
    // Agendamento coberto dentro da carência (antes de expirar).
    const barber = await createBarber(t.db);

    await ctx.run(at(END, HOUR));
    let sub = await subOf(ctx.client.id);
    expect(sub).toMatchObject({ status: "past_due", retryCount: 1, pastDueSince: END, nextChargeAt: at(END, DAY) });
    expect(ctx.whatsapp.sendText).toHaveBeenCalledTimes(1);
    expect(ctx.whatsapp.sendText.mock.calls[0][2]).toMatch(/https:\/\/app\.test\/clube\/cartao/);
    // Acesso mantido na carência; o cartão de membro mostra o aviso.
    expect(await getActiveSubscription(t.db, ctx.client.id, at(END, 2 * HOUR))).not.toBeNull();
    expect((await getMemberSubscription(t.db, ctx.client.id, at(END, 2 * HOUR)))!.canChangeCard).toBe(true);

    // Mesma hora de novo: nem nova cobrança nem nova mensagem.
    await ctx.run(at(END, 2 * HOUR));
    expect(ctx.fake.gw.createCardCharge).toHaveBeenCalledTimes(2);
    expect(ctx.whatsapp.sendText).toHaveBeenCalledTimes(1);

    // Cobertura durante a carência: janela [fim, fim + 3 dias).
    const startsAt = sp("2026-12-05", "10:00");
    const coverage = await getCoverage(t.db, ctx.client.id, { serviceId: "svc-corte", startsAt: startsAt.getTime(), now: at(END, 2 * HOUR) });
    expect(coverage.covered).toBe(true);
    expect((await getClubUsage(t.db, ctx.client.id, at(END, 2 * HOUR)))!.periodEnd).toEqual(at(END, 3 * DAY));
    const entry = await createAppointment(
      t.db, ctx.client,
      { barberId: barber.id, serviceId: "svc-corte", startsAt: startsAt.getTime(), paymentChoice: "local" },
      at(END, 2 * HOUR),
    );
    expect(entry.paymentMethod).toBe("subscription");

    await ctx.run(at(END, DAY + HOUR));
    sub = await subOf(ctx.client.id);
    expect(sub).toMatchObject({ status: "past_due", retryCount: 2, nextChargeAt: at(END, 2 * DAY) });
    await ctx.run(at(END, 2 * DAY + HOUR));
    sub = await subOf(ctx.client.id);
    expect(sub).toMatchObject({ status: "past_due", retryCount: 3, nextChargeAt: null });
    expect(ctx.fake.gw.createCardCharge).toHaveBeenCalledTimes(4);
    expect(ctx.whatsapp.sendText).toHaveBeenCalledTimes(3);
    expect(ctx.whatsapp.sendText.mock.calls[2][2]).not.toMatch(/tentar de novo/);

    await ctx.run(at(END, 3 * DAY + HOUR));
    sub = await subOf(ctx.client.id);
    expect(sub.status).toBe("expired");
    expect(await getActiveSubscription(t.db, ctx.client.id, at(END, 3 * DAY + HOUR))).toBeNull();
    const [released] = await t.db.select().from(scheduleEntries).where(eq(scheduleEntries.id, entry.id));
    expect(released).toMatchObject({ paymentMethod: "local", paymentStatus: "unpaid", status: "booked" });
    expect(ctx.fake.gw.createCardCharge).toHaveBeenCalledTimes(4);
  });

  it("nova tentativa aprovada volta a ativa, estendendo a partir do fim anterior", async () => {
    const ctx = await subscribedWithCard();
    ctx.fake.queueCard("REFUSE");
    await ctx.run(at(END, HOUR));
    await ctx.run(at(END, DAY + HOUR));
    expect(await subOf(ctx.client.id)).toMatchObject({
      status: "active",
      currentPeriodStart: END,
      currentPeriodEnd: addCycle(END, "MONTHLY"),
      retryCount: 0,
      pastDueSince: null,
      nextChargeAt: addCycle(END, "MONTHLY"),
    });
  });

  it("idempotência sob timeout: concilia em vez de recobrar; sem cobrança encontrada, falha após 10 min", async () => {
    const ctx = await subscribedWithCard();
    ctx.fake.queueCard("TIMEOUT");
    await ctx.run(at(END, 5 * 60_000));
    const sub = await subOf(ctx.client.id);
    const pending = (await paymentsOf(sub.id)).at(-1)!;
    expect(pending).toMatchObject({ status: "pending", providerId: null, attempt: 1 });
    expect(sub.status).toBe("active");

    // Próxima execução: concilia (a cobrança existe) e não cobra de novo.
    await ctx.run(at(END, 10 * 60_000));
    expect(ctx.fake.gw.createCardCharge).toHaveBeenCalledTimes(2);
    expect((await subOf(ctx.client.id)).currentPeriodEnd).toEqual(addCycle(END, "MONTHLY"));

    // Falha de rede antes de chegar ao AbacatePay: nada criado → falha após 10 min.
    const next = addCycle(END, "MONTHLY");
    ctx.fake.queueCard("NETWORK");
    await ctx.run(at(next, 0));
    await ctx.run(at(next, 5 * 60_000));
    expect((await subOf(ctx.client.id)).status).toBe("active");
    expect(ctx.fake.gw.createCardCharge).toHaveBeenCalledTimes(3);
    await ctx.run(at(next, 11 * 60_000));
    expect(await subOf(ctx.client.id)).toMatchObject({ status: "past_due", retryCount: 1, nextChargeAt: at(next, DAY) });
    expect(ctx.fake.gw.createCardCharge).toHaveBeenCalledTimes(3);
  });

  it("cartão sem token salvo (assinatura antiga) falha e pede para cadastrar o cartão", async () => {
    const ctx = await setup();
    const [sub] = await t.db
      .insert(subscriptions)
      .values({
        userId: ctx.client.id, planId: ctx.plan.id, status: "active", provider: "abacatepay", method: "CARD",
        paymentMethod: "CARD", currentPeriodEnd: END, nextChargeAt: END,
      })
      .returning();
    await ctx.run(at(END, HOUR));
    expect(ctx.fake.gw.createCardCharge).not.toHaveBeenCalled();
    expect(await subOf(ctx.client.id)).toMatchObject({ id: sub.id, status: "past_due", lastChargeError: "Nenhum cartão salvo." });
    expect(ctx.whatsapp.sendText).toHaveBeenCalledTimes(1);
  });
});

describe("renovações no Pix (cron)", () => {
  async function subscribedWithPix() {
    const ctx = await setup();
    const result = await subscribeWithPix(t.db, ctx.client, ctx.deps, { planId: ctx.plan.id }, NOW);
    ctx.fake.setPix("pix_char_1", "PAID");
    await refreshPixPayment(t.db, ctx.deps, result.paymentId, { now: NOW });
    return { ...ctx, subscriptionId: result.subscriptionId };
  }

  it("gera o Pix 3 dias antes, envia no WhatsApp uma vez e estende ao pagar", async () => {
    const ctx = await subscribedWithPix();
    expect((await ctx.run(at(END, -3 * DAY - HOUR))).pixSent).toBe(0);
    expect((await ctx.run(at(END, -3 * DAY + HOUR))).pixSent).toBe(1);
    expect((await ctx.run(at(END, -3 * DAY + 2 * HOUR))).pixSent).toBe(0);
    expect(ctx.fake.gw.createPixCharge).toHaveBeenCalledTimes(2);
    const expiresIn = ctx.fake.gw.createPixCharge.mock.calls[1][0].expiresInSeconds;
    expect(expiresIn).toBe((6 * DAY - HOUR) / 1000);

    const renewal = (await paymentsOf(ctx.subscriptionId)).at(-1)!;
    expect(renewal).toMatchObject({ status: "pending", method: "PIX", cycleStart: END, providerId: "pix_char_2" });
    expect(ctx.whatsapp.sendText).toHaveBeenCalledTimes(1);
    expect(ctx.whatsapp.sendText.mock.calls[0][2]).toContain(`https://app.test/clube/pagar/${renewal.id}`);
    expect((await getMemberSubscription(t.db, ctx.client.id, at(END, -2 * DAY)))!.pendingPixPaymentId).toBe(renewal.id);

    // Pago atrasado (na carência): o novo ciclo começa no fim do anterior.
    await ctx.run(at(END, HOUR));
    expect((await subOf(ctx.client.id)).status).toBe("past_due");
    ctx.fake.setPix("pix_char_2", "PAID");
    await handleAbacateWebhook(
      t.db, ctx.deps,
      { id: "log_pix", event: "transparent.completed", data: { transparent: { id: "pix_char_2" } } },
      at(END, DAY),
    );
    expect(await subOf(ctx.client.id)).toMatchObject({
      status: "active",
      currentPeriodStart: END,
      currentPeriodEnd: addCycle(END, "MONTHLY"),
      nextChargeAt: at(addCycle(END, "MONTHLY"), -3 * DAY),
      pastDueSince: null,
    });
  });

  it("sem pagamento: pendente no vencimento e encerrada 3 dias depois", async () => {
    const ctx = await subscribedWithPix();
    await ctx.run(at(END, -3 * DAY + HOUR));
    await ctx.run(at(END, HOUR));
    expect((await subOf(ctx.client.id)).status).toBe("past_due");
    expect(await getActiveSubscription(t.db, ctx.client.id, at(END, 2 * DAY))).not.toBeNull();
    await ctx.run(at(END, 3 * DAY + HOUR));
    expect((await subOf(ctx.client.id)).status).toBe("expired");
    expect((await paymentsOf(ctx.subscriptionId)).at(-1)!.status).toBe("cancelled");
  });
});

describe("cancelamento", () => {
  it("cliente cancela: sem novas cobranças e acesso até o fim do período", async () => {
    const ctx = await subscribedWithCard();
    const stranger = await createUser(t.db);
    const sub = await subOf(ctx.client.id);
    await expect(cancelSubscription(t.db, stranger, sub.id, {}, NOW)).rejects.toMatchObject({ code: "not_found" });
    await expect(cancelSubscription(t.db, ctx.client, sub.id, { immediate: true }, NOW)).rejects.toMatchObject({ code: "forbidden" });

    const { endsAt } = await cancelSubscription(t.db, ctx.client, sub.id, {}, at(NOW, DAY));
    expect(endsAt).toEqual(END);
    expect(await subOf(ctx.client.id)).toMatchObject({ status: "active", cancelAtPeriodEnd: true, nextChargeAt: null });
    expect(await getActiveSubscription(t.db, ctx.client.id, at(END, -HOUR))).not.toBeNull();

    const summary = await ctx.run(at(END, HOUR));
    expect(summary).toMatchObject({ cancelled: 1, charged: 0 });
    expect(ctx.fake.gw.createCardCharge).toHaveBeenCalledTimes(1);
    expect((await subOf(ctx.client.id)).status).toBe("cancelled");
    expect(await getActiveSubscription(t.db, ctx.client.id, at(END, HOUR))).toBeNull();
  });

  it("gestão encerra na hora e libera os horários cobertos", async () => {
    const ctx = await subscribedWithCard();
    const admin = await createAdmin(t.db);
    const barber = await createBarber(t.db);
    const entry = await createAppointment(
      t.db, ctx.client,
      { barberId: barber.id, serviceId: "svc-corte", startsAt: sp("2026-11-05", "10:00").getTime(), paymentChoice: "local" },
      NOW,
    );
    expect(entry.paymentMethod).toBe("subscription");
    const sub = await subOf(ctx.client.id);
    await cancelSubscription(t.db, admin, sub.id, { immediate: true }, at(NOW, HOUR));
    expect(await subOf(ctx.client.id)).toMatchObject({ status: "cancelled", nextChargeAt: null });
    const [row] = await t.db.select().from(scheduleEntries).where(eq(scheduleEntries.id, entry.id));
    expect(row).toMatchObject({ paymentMethod: "local", paymentStatus: "unpaid" });
  });
});

describe("gestão: cobrar agora, estornar e trocar cartão", () => {
  it("cobrar agora antecipa a renovação a partir do fim do período", async () => {
    const ctx = await subscribedWithCard();
    const admin = await createAdmin(t.db);
    const sub = await subOf(ctx.client.id);
    await expect(chargeSubscriptionNow(t.db, ctx.client, ctx.deps, sub.id, NOW)).rejects.toMatchObject({ code: "forbidden" });
    const result = await chargeSubscriptionNow(t.db, admin, ctx.deps, sub.id, at(NOW, DAY));
    expect(result.status).toBe("paid");
    expect(await subOf(ctx.client.id)).toMatchObject({ currentPeriodStart: END, currentPeriodEnd: addCycle(END, "MONTHLY") });

    // Recusa antecipada não coloca em atraso.
    ctx.fake.queueCard("REFUSE");
    await expect(chargeSubscriptionNow(t.db, admin, ctx.deps, sub.id, at(NOW, 2 * DAY))).rejects.toThrow(/recusado/);
    expect((await subOf(ctx.client.id)).status).toBe("active");
  });

  it("estorna o último pagamento e encerra na hora", async () => {
    const ctx = await subscribedWithCard();
    const admin = await createAdmin(t.db);
    const sub = await subOf(ctx.client.id);
    const refunded = await refundLastSubscriptionPayment(t.db, admin, ctx.fake.gw, sub.id, at(NOW, DAY));
    expect(ctx.fake.gw.refund).toHaveBeenCalledWith("card_1", expect.any(String));
    expect(refunded.status).toBe("refunded");
    expect((await subOf(ctx.client.id)).status).toBe("cancelled");
    await expect(refundLastSubscriptionPayment(t.db, admin, ctx.fake.gw, sub.id, NOW)).rejects.toThrow(/Não há pagamento/);
  });

  it("trocar cartão: só perto da renovação ou em atraso; cobra no cartão novo e passa a usá-lo", async () => {
    const ctx = await subscribedWithCard();
    const input = { token: "ctok_new", consent: true };
    await expect(changeSubscriptionCard(t.db, ctx.client, ctx.deps, input, at(NOW, DAY))).rejects.toThrow(/3 dias antes/);

    const when = at(END, -2 * DAY);
    const result = await changeSubscriptionCard(t.db, ctx.client, ctx.deps, input, when);
    expect(result.status).toBe("paid");
    expect(ctx.fake.gw.createCardCharge).toHaveBeenLastCalledWith(expect.objectContaining({ token: "ctok_new" }));
    const cards = await t.db.select().from(paymentMethods).orderBy(paymentMethods.createdAt);
    expect(cards.map((c) => c.active)).toEqual([false, true]);
    expect(await subOf(ctx.client.id)).toMatchObject({
      paymentMethodId: cards[1].id,
      currentPeriodStart: END,
      currentPeriodEnd: addCycle(END, "MONTHLY"),
      nextChargeAt: addCycle(END, "MONTHLY"),
    });
    // A renovação agendada não cobra de novo.
    await ctx.run(at(END, HOUR));
    expect(ctx.fake.gw.createCardCharge).toHaveBeenCalledTimes(2);
  });

  it("assinante no Pix pode passar para o cartão perto da renovação (cancela o Pix pendente)", async () => {
    const ctx = await setup();
    const first = await subscribeWithPix(t.db, ctx.client, ctx.deps, { planId: ctx.plan.id }, NOW);
    ctx.fake.setPix("pix_char_1", "PAID");
    await refreshPixPayment(t.db, ctx.deps, first.paymentId, { now: NOW });
    await ctx.run(at(END, -3 * DAY + HOUR));
    await changeSubscriptionCard(t.db, ctx.client, ctx.deps, { token: "ctok_new", taxId: CPF, consent: true }, at(END, -2 * DAY));
    const sub = await subOf(ctx.client.id);
    expect(sub).toMatchObject({ paymentMethod: "CARD", nextChargeAt: addCycle(END, "MONTHLY") });
    const pixRenewal = (await paymentsOf(sub.id)).find((p) => p.providerId === "pix_char_2")!;
    expect(pixRenewal.status).toBe("cancelled");
  });
});

describe("webhooks de estorno e contestação", () => {
  it("refunded/lost encerram; disputed para de renovar; conferem o status na API", async () => {
    const ctx = await subscribedWithCard();
    const sub = await subOf(ctx.client.id);
    const event = (id: string, name: string) => ({ id, event: name, data: { transparent: { id: "card_1" } } });

    // A API ainda diz aprovado: evento ignorado.
    await handleAbacateWebhook(t.db, ctx.deps, event("log_r0", "transparent.refunded"), NOW);
    expect((await paymentsOf(sub.id))[0].status).toBe("paid");

    ctx.fake.setCard("card_1", "UNDER_DISPUTE");
    await handleAbacateWebhook(t.db, ctx.deps, event("log_d", "transparent.disputed"), NOW);
    expect((await paymentsOf(sub.id))[0].status).toBe("disputed");
    expect(await subOf(ctx.client.id)).toMatchObject({ status: "active", cancelAtPeriodEnd: true, nextChargeAt: null });

    ctx.fake.setCard("card_1", "REFUNDED");
    await handleAbacateWebhook(t.db, ctx.deps, event("log_l", "transparent.lost"), NOW);
    expect((await paymentsOf(sub.id))[0]).toMatchObject({ status: "refunded", failureReason: expect.stringMatching(/Contestação/) });
    expect((await subOf(ctx.client.id)).status).toBe("cancelled");
    expect(await handleAbacateWebhook(t.db, ctx.deps, event("log_l", "transparent.lost"), NOW)).toBe("duplicate");
    expect(await t.db.select().from(webhookEvents)).toHaveLength(3);
  });

  it("evento de cobrança sem resposta é casado pela metadata", async () => {
    const ctx = await setup();
    ctx.fake.queueCard("TIMEOUT");
    const result = await subscribeWithCard(
      t.db, ctx.client, ctx.deps, { planId: ctx.plan.id, token: "ctok_abc", taxId: CPF, consent: true }, NOW,
    );
    await handleAbacateWebhook(
      t.db, ctx.deps,
      { id: "log_m", event: "transparent.completed", data: { transparent: { id: "card_1", metadata: { paymentId: result.paymentId } } } },
      at(NOW, 60_000),
    );
    expect((await subOf(ctx.client.id)).status).toBe("active");
    const [payment] = await t.db.select().from(payments).where(and(eq(payments.id, result.paymentId)));
    expect(payment).toMatchObject({ status: "paid", providerId: "card_1" });
  });
});

describe("avisos de cobrança", () => {
  it("registra no histórico do WhatsApp como cobrança", async () => {
    const ctx = await subscribedWithCard();
    ctx.fake.queueCard("REFUSE");
    await ctx.run(at(END, HOUR));
    const logs = await t.db.select().from(whatsappLogs).where(eq(whatsappLogs.kind, "billing"));
    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe("sent");
  });
});
