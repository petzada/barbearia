import type { Metadata } from "next";
import { Suspense } from "react";
import { Check, Crown, Sparkles } from "lucide-react";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import { requireOnboardedUser } from "@/server/auth";
import { getActiveSubscription, listPlans, listUserPayments } from "@/server/payments/service";
import { EmptyState, PageBody, PageHeader, SectionTitle } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { dateKeyFromIsoInSP, formatPriceCents, formatSelectableDay } from "@/lib/agenda/availability";
import { CYCLE_LABELS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { ClubActions, SubscriptionReturnToast } from "./club-actions";

export const metadata: Metadata = { title: "Clube" };

const METHOD_LABELS: Record<string, string> = {
  CARD: "Cartão",
  PIX: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão (balcão)",
  pix_balcao: "Pix (balcão)",
};

const formatDay = (date: Date | null) => (date ? formatSelectableDay(dateKeyFromIsoInSP(date)).split(", ")[1] : "—");

export default async function ClubePage() {
  const user = await requireOnboardedUser();
  const [db, env] = await Promise.all([getDb(), getServerEnv()]);
  const [plans, active, history] = await Promise.all([
    listPlans(db),
    getActiveSubscription(db, user.id),
    listUserPayments(db, user.id),
  ]);
  const online = Boolean(env.abacatePayApiKey);
  const ordered = [...plans].sort((a, b) => Number(b.highlighted) - Number(a.highlighted));

  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={null}>
        <SubscriptionReturnToast />
      </Suspense>
      <PageHeader
        title="Clube Moura"
        description={active ? "Você é membro. Aproveite seus benefícios." : "Assine e tenha o visual sempre em dia."}
      />
      <PageBody className="gap-8">
        {active ? (
          <>
            <section
              aria-label="Cartão de membro"
              className="relative flex aspect-[1.6/1] max-w-md flex-col justify-between overflow-hidden rounded-[22px] bg-ink p-6 text-white shadow-card"
            >
              <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-cta/30 blur-2xl" aria-hidden />
              <div className="relative flex items-start justify-between">
                <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white/70">
                  <Crown className="size-5 text-cta" aria-hidden />
                  Clube Moura
                </span>
                <Badge className="bg-success/25 text-white">Ativa</Badge>
              </div>
              <div className="relative">
                <p className="text-2xl font-extrabold uppercase tracking-tight">{active.plan.name}</p>
                <p className="text-sm text-white/70">{user.name}</p>
              </div>
              <div className="relative flex items-end justify-between text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/50">
                    {active.provider === "abacatepay" ? "Renova em" : "Válida até"}
                  </p>
                  <p className="tabular font-bold">{formatDay(active.currentPeriodEnd)}</p>
                </div>
                <p className="tabular font-bold">
                  {formatPriceCents(active.plan.priceCents)}/{CYCLE_LABELS[active.plan.cycle]}
                </p>
              </div>
            </section>

            {active.plan.benefits.length > 0 && (
              <section className="flex flex-col gap-3">
                <SectionTitle>Seus benefícios</SectionTitle>
                <ul className="flex flex-col gap-2 rounded-lg bg-card p-5 shadow-card">
                  {active.plan.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-[15px]">
                      <Check className="mt-0.5 size-4 shrink-0 text-cta" aria-hidden />
                      {b}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : ordered.length === 0 ? (
          <EmptyState icon={Sparkles} title="Planos em breve" description="O Clube Moura está sendo preparado. Fique de olho!" />
        ) : (
          <section aria-label="Planos" className="flex flex-col gap-4">
            {ordered.map((plan) => (
              <article
                key={plan.id}
                className={cn(
                  "flex flex-col gap-4 rounded-lg p-6 shadow-card",
                  plan.highlighted ? "bg-ink text-white ring-2 ring-cta" : "bg-card",
                )}
              >
                {plan.highlighted && (
                  <Badge className="w-fit bg-cta text-cta-foreground">
                    <Sparkles aria-hidden />
                    Recomendado
                  </Badge>
                )}
                <div>
                  <h2 className="text-xl font-extrabold">{plan.name}</h2>
                  {plan.description && (
                    <p className={cn("text-sm", plan.highlighted ? "text-white/70" : "text-ink-subtle")}>{plan.description}</p>
                  )}
                </div>
                <p>
                  <span className="tabular text-4xl font-extrabold tracking-tight">{formatPriceCents(plan.priceCents)}</span>
                  <span className={cn("text-sm", plan.highlighted ? "text-white/60" : "text-ink-subtle")}>
                    {" "}
                    /{CYCLE_LABELS[plan.cycle]}
                  </span>
                </p>
                {plan.benefits.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {plan.benefits.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-[15px]">
                        <Check className="mt-0.5 size-4 shrink-0 text-cta" aria-hidden />
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
                {online ? (
                  <ClubActions mode="subscribe" planId={plan.id} highlighted={plan.highlighted} />
                ) : (
                  <p className={cn("text-sm", plan.highlighted ? "text-white/70" : "text-ink-subtle")}>
                    Assine direto na barbearia.
                  </p>
                )}
              </article>
            ))}
            <p className="text-xs text-ink-subtle">
              Cobrança recorrente no cartão ou Pix Automático, processada pelo AbacatePay. Cancele quando quiser.
            </p>
          </section>
        )}

        {history.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionTitle>Pagamentos</SectionTitle>
            <ul className="divide-y divide-hairline rounded-lg bg-card shadow-card">
              {history.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-4 text-sm">
                  <div>
                    <p className="font-bold">{p.kind === "subscription" ? "Clube Moura" : "Agendamento"}</p>
                    <p className="text-ink-subtle">
                      {formatDay(p.paidAt)} · {METHOD_LABELS[p.method] ?? p.method}
                    </p>
                  </div>
                  <span className="tabular font-bold">{formatPriceCents(p.amountCents)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {active?.provider === "abacatepay" && (
          <div className="flex justify-center pt-4">
            <ClubActions mode="cancel" subscriptionId={active.id} />
          </div>
        )}
      </PageBody>
    </main>
  );
}
