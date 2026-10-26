import { and, eq, gte } from "drizzle-orm";
import type { Db } from "./db";
import {
  account,
  feedbacks,
  payments,
  scheduleEntries,
  session,
  user,
  verification,
} from "./db/schema";
import type { Actor } from "./actor";
import { DomainError } from "./errors";
import { closeBillingForUser } from "./payments/subscriptions";

export const DELETED_ACCOUNT_NAME = "Conta excluída";

/**
 * Exclusão de conta pelo próprio cliente (LGPD).
 * - Cancela horários futuros, Pix pendentes e a assinatura do clube (sem novas
 *   cobranças) e desativa os cartões salvos;
 * - Apaga sessões, vínculos de login e códigos pendentes;
 * - Anonimiza o cadastro (o histórico financeiro continua consistente, sem dados pessoais).
 * Gestão e barbeiros precisam ter o acesso removido antes.
 */
export async function deleteOwnAccount(
  db: Db,
  actor: Actor,
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

  // Renovações são cobradas pelo nosso servidor: encerrar aqui e desativar os
  // cartões salvos basta para não haver cobranças futuras.
  await closeBillingForUser(db, actor.id, now);

  await db.batch([
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
