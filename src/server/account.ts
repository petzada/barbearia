import { and, eq, gte, inArray } from "drizzle-orm";
import type { Db } from "./db";
import {
  account,
  feedbacks,
  payments,
  scheduleEntries,
  session,
  subscriptions,
  user,
  verification,
} from "./db/schema";
import type { Actor } from "./actor";
import { DomainError } from "./errors";
import type { PaymentGateway } from "./payments/abacatepay";

export const DELETED_ACCOUNT_NAME = "Conta excluída";

/**
 * Exclusão de conta pelo próprio cliente (LGPD).
 * - Cancela horários futuros e Pix pendentes; cancela a assinatura no AbacatePay
 *   (melhor esforço — se falhar, a assinatura local é encerrada mesmo assim);
 * - Apaga sessões, vínculos de login e códigos pendentes;
 * - Anonimiza o cadastro (o histórico financeiro continua consistente, sem dados pessoais).
 * Gestão e barbeiros precisam ter o acesso removido antes.
 */
export async function deleteOwnAccount(
  db: Db,
  actor: Actor,
  gateway: PaymentGateway | null,
  now: Date = new Date(),
): Promise<void> {
  if (actor.isAdmin) {
    throw new DomainError(
      "invalid",
      "Contas de gestão não podem ser excluídas por aqui. Transfira o acesso de gestão para outra pessoa antes.",
    );
  }
  if (actor.isBarber) {
    throw new DomainError(
      "invalid",
      "Peça à gestão para remover seu acesso de barbeiro antes de excluir a conta.",
    );
  }
  const current = await db.query.user.findFirst({ where: eq(user.id, actor.id) });
  if (!current) throw new DomainError("not_found", "Conta não encontrada.");

  const activeSubs = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, actor.id), eq(subscriptions.status, "active")));
  for (const sub of activeSubs) {
    if (sub.provider === "abacatepay" && sub.providerSubscriptionId && gateway) {
      try {
        await gateway.cancelSubscription(sub.providerSubscriptionId);
      } catch (error) {
        console.warn("[conta] falha ao cancelar assinatura no AbacatePay", sub.id, error);
      }
    }
  }

  await db.batch([
    db
      .update(subscriptions)
      .set({ status: "cancelled", cancelledAt: now })
      .where(and(eq(subscriptions.userId, actor.id), inArray(subscriptions.status, ["active", "pending"]))),
    db
      .update(scheduleEntries)
      .set({ status: "cancelled", cancelledAt: now, cancelledById: actor.id })
      .where(
        and(
          eq(scheduleEntries.clientId, actor.id),
          eq(scheduleEntries.status, "booked"),
          gte(scheduleEntries.startsAt, now),
        ),
      ),
    db
      .update(payments)
      .set({ status: "cancelled" })
      .where(and(eq(payments.userId, actor.id), eq(payments.status, "pending"))),
    db.update(feedbacks).set({ comment: null }).where(eq(feedbacks.clientId, actor.id)),
    db.delete(session).where(eq(session.userId, actor.id)),
    db.delete(account).where(eq(account.userId, actor.id)),
    ...(current.phoneNumber
      ? [db.delete(verification).where(eq(verification.identifier, current.phoneNumber))]
      : []),
    db
      .update(user)
      .set({
        name: DELETED_ACCOUNT_NAME,
        email: `excluida-${actor.id}@contas.barbeariadomoura.app`,
        emailVerified: false,
        phoneNumber: null,
        phoneNumberVerified: false,
        image: null,
        profileCompleted: false,
        whatsappReminders: false,
      })
      .where(eq(user.id, actor.id)),
  ]);
}
