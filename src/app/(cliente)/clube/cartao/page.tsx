import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import { requireOnboardedUser } from "@/server/auth";
import { isPhoneTempEmail } from "@/server/auth/config";
import { getMemberSubscription } from "@/server/payments/service";
import { EmptyState, PageBody, PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { formatPriceCents } from "@/lib/agenda/availability";
import { formatDayLong, formatDayMonth } from "@/lib/agenda/format";
import { billingMethodLabel, CHANGE_CARD_WINDOW_MS, graceEndOf } from "@/lib/club-billing";
import { formatBrazilPhone } from "@/lib/phone";
import { ChangeCardFlow } from "./change-card-flow";

export const metadata: Metadata = { title: "Trocar cartão" };

/**
 * Trocar cartão: só com pagamento pendente ou a até 3 dias da renovação.
 * Cobra o próximo ciclo no cartão novo e estende a partir do fim do período.
 */
export default async function TrocarCartaoPage() {
  const user = await requireOnboardedUser();
  const [db, env] = await Promise.all([getDb(), getServerEnv()]);
  const sub = await getMemberSubscription(db, user.id);
  if (!sub) redirect("/clube");
  const amountCents = sub.priceCents ?? sub.plan.priceCents;
  const end = sub.currentPeriodEnd!;
  const pastDue = sub.status === "past_due";

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        title={pastDue ? "Atualizar cartão" : "Trocar cartão"}
        description={`Atual: ${billingMethodLabel(sub.paymentMethod, sub.card)}`}
        backHref="/clube"
      />
      <PageBody>
        {!sub.canChangeCard || !env.abacatePayPublicKey ? (
          <EmptyState
            icon={CreditCard}
            title={
              env.abacatePayPublicKey
                ? `Você poderá trocar o cartão a partir de ${formatDayMonth(new Date(end.getTime() - CHANGE_CARD_WINDOW_MS))}`
                : "Troca de cartão indisponível no momento"
            }
            description="A troca cobra a próxima mensalidade no cartão novo, por isso fica disponível perto da renovação."
            action={
              <Link href="/clube" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Voltar ao clube
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-5">
            <p className="rounded-lg bg-card p-5 text-[15px] shadow-card">
              {pastDue
                ? `A renovação do seu plano não foi paga. Seu acesso continua até ${formatDayLong(graceEndOf(end))}. `
                : `Seu plano renova em ${formatDayLong(end)}. `}
              Ao confirmar, cobramos {formatPriceCents(amountCents)} no cartão novo e o próximo período vai até{" "}
              <strong>um ciclo depois de {formatDayMonth(end)}</strong>. As próximas renovações usam este cartão.
            </p>
            <ChangeCardFlow
              publicKey={env.abacatePayPublicKey}
              amountCents={amountCents}
              payer={{
                name: user.name,
                cellphone: formatBrazilPhone(user.phoneNumber),
                email: isPhoneTempEmail(user.email) ? null : user.email,
                billingEmail: user.billingEmail,
                taxId: user.taxId,
              }}
            />
          </div>
        )}
      </PageBody>
    </main>
  );
}
