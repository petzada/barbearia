import type { Metadata } from "next";
import { Suspense } from "react";
import { Check, Crown } from "lucide-react";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import { requireOnboardedUser } from "@/server/auth";
import { getActiveSubscription, listPlans, listUserPayments } from "@/server/payments/service";
import { EmptyState, PageBody, PageHeader, SectionTitle } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { formatPriceCents, formatSelectableDay, dateKeyFromIsoInSP } from "@/lib/agenda/availability";
import { CYCLE_LABELS } from "@/lib/plans";
import { ClubActions, SubscriptionReturnToast } from "./club-actions";

export const metadata: Metadata = { title: "Clube" };

const METHOD_LABELS: Record<string, string> = {
  CARD: "Cartão",
  PIX: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão (balcão)",
  pix_balcao: "Pix (balcão)",
};

export default async function ClubePage() {
  const user = await requireOnboardedUser();
  const [db, env] = await Promise.all([getDb(), getServerEnv()]);
  const [plans, active, history] = await Promise.all([
    listPlans(db),
    getActiveSubscription(db, user.id),
    listUserPayments(db, user.id),
  ]);
  const online = Boolean(env.abacatePayApiKey);

  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={null}>
        <SubscriptionReturnToast />
      </Suspense>
      <PageHeader title="Clube Moura" description="Assine e tenha a barba e o cabelo sempre em dia." />
      <PageBody className="gap-8">
        {active && (
          <section className="flex flex-col gap-4 rounded-lg bg-ink p-6 text-white shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-md bg-white/10 text-cta">
                  <Crown className="size-6" aria-hidden />
                </span>
                <div>
                  <p className="text-sm text-white/60">Sua assinatura</p>
                  <p className="text-xl font-extrabold">{active.plan.name}</p>
                </div>
              </div>
              <Badge variant="success" className="bg-success/20 text-white">
                Ativa
              </Badge>
            </div>
            <p className="text-sm text-white/70">
              {active.provider === "abacatepay" ? "Renova automaticamente em " : "Válida até "}
              <strong className="text-white">
                {active.currentPeriodEnd ? formatSelectableDay(dateKeyFromIsoInSP(active.currentPeriodEnd)) : "—"}
              </strong>
              {" · "}
              {formatPriceCents(active.plan.priceCents)}/{CYCLE_LABELS[active.plan.cycle]}
            </p>
            {active.provider === "abacatepay" && <ClubActions mode="cancel" subscriptionId={active.id} />}
          </section>
        )}

        <section className="flex flex-col gap-4">
          <SectionTitle>{active ? "Planos" : "Escolha seu plano"}</SectionTitle>
          {plans.length === 0 ? (
            <EmptyState
              title="Planos em breve"
              description="O Clube Moura está sendo preparado. Fique de olho!"
            />
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {plans.map((plan) => {
                const isCurrent = active?.planId === plan.id;
                return (
                  <li key={plan.id} className="flex flex-col gap-4 rounded-lg bg-card p-6 shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-extrabold">{plan.name}</p>
                        {plan.description && <p className="text-sm text-ink-subtle">{plan.description}</p>}
                      </div>
                      {isCurrent && <Badge variant="soft">Seu plano</Badge>}
                    </div>
                    <p>
                      <span className="tabular text-3xl font-extrabold tracking-tight">
                        {formatPriceCents(plan.priceCents)}
                      </span>
                      <span className="text-sm text-ink-subtle"> /{CYCLE_LABELS[plan.cycle]}</span>
                    </p>
                    {plan.benefits.length > 0 && (
                      <ul className="flex flex-col gap-2">
                        {plan.benefits.map((b) => (
                          <li key={b} className="flex items-start gap-2 text-sm">
                            <Check className="mt-0.5 size-4 shrink-0 text-cta" aria-hidden />
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                    {!active && (
                      online ? (
                        <ClubActions mode="subscribe" planId={plan.id} />
                      ) : (
                        <p className="text-sm text-ink-subtle">Assine direto na barbearia.</p>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-xs text-ink-subtle">
            Pagamento recorrente no cartão ou Pix Automático, processado pelo AbacatePay. Cancele quando quiser.
          </p>
        </section>

        {history.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionTitle>Pagamentos</SectionTitle>
            <ul className="divide-y divide-hairline rounded-lg bg-card shadow-card">
              {history.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-4 text-sm">
                  <div>
                    <p className="font-bold">{p.kind === "subscription" ? "Clube" : "Agendamento"}</p>
                    <p className="text-ink-subtle">
                      {p.paidAt ? formatSelectableDay(dateKeyFromIsoInSP(p.paidAt)) : "—"} · {METHOD_LABELS[p.method] ?? p.method}
                    </p>
                  </div>
                  <span className="tabular font-bold">{formatPriceCents(p.amountCents)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </PageBody>
    </main>
  );
}
