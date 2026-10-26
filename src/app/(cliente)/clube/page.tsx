import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Check, Crown, Sparkles } from "lucide-react";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import { requireOnboardedUser } from "@/server/auth";
import { getActiveSubscription, listPlans, listUserPayments } from "@/server/payments/service";
import { getClubUsage } from "@/server/club-coverage";
import { listServices } from "@/server/catalog";
import { EmptyState, PageBody, PageHeader, SectionTitle } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { rowGroupClass, staticRowClass } from "@/lib/ui/classes";
import { formatPriceCents } from "@/lib/agenda/availability";
import { formatDayMonth } from "@/lib/agenda/format";
import { paymentMethodLabel } from "@/lib/payments";
import { CYCLE_LABELS, planRulesSummary } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { PlanCard } from "@/components/club/plan-card";
import { ClubActions, SubscriptionReturnToast } from "./club-actions";

export const metadata: Metadata = { title: "Clube" };

const formatDay = (date: Date | null) => (date ? formatDayMonth(date) : "—");

export default async function ClubePage() {
  const user = await requireOnboardedUser();
  const [db, env] = await Promise.all([getDb(), getServerEnv()]);
  const [plans, active, history, usage, services] = await Promise.all([
    listPlans(db),
    getActiveSubscription(db, user.id),
    listUserPayments(db, user.id),
    getClubUsage(db, user.id),
    listServices(db, { includeInactive: true }),
  ]);
  const serviceNames = (ids: string[]) => services.filter((s) => ids.includes(s.id)).map((s) => s.name);
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
              className="relative flex aspect-[1.6/1] max-w-md flex-col justify-between overflow-hidden rounded-xl bg-surface-dark p-6 text-on-dark shadow-card"
            >
              <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-cta/30 blur-2xl" aria-hidden />
              <div className="relative flex items-start justify-between">
                <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-on-dark/70">
                  <Crown className="size-5 text-cta-on-dark" aria-hidden />
                  Clube Moura
                </span>
                <Badge variant="on-dark">Ativa</Badge>
              </div>
              <div className="relative">
                <p className="text-2xl font-extrabold uppercase tracking-tight">{active.plan.name}</p>
                <p className="text-sm text-on-dark/70">{user.name}</p>
              </div>
              <div className="relative flex items-end justify-between text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wider text-on-dark/70">
                    {active.provider === "abacatepay" ? "Renova em" : "Válida até"}
                  </p>
                  <p className="tabular font-bold">{formatDay(active.currentPeriodEnd)}</p>
                </div>
                <p className="tabular font-bold">
                  {formatPriceCents(active.plan.priceCents)}/{CYCLE_LABELS[active.plan.cycle]}
                </p>
              </div>
            </section>

            {usage && usage.total > 0 && (
              <section aria-label="Uso do ciclo" className="flex flex-col gap-3 rounded-lg bg-card p-5 shadow-card">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-bold">
                    {usage.used} de {usage.total} atendimentos usados neste ciclo
                  </p>
                  <span className="tabular text-sm text-ink-subtle">até {formatDay(usage.periodEnd)}</span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={usage.total}
                  aria-valuenow={usage.used}
                  aria-label="Atendimentos usados"
                >
                  <div className="h-full rounded-full bg-cta" style={{ width: `${Math.min(100, (usage.used / usage.total) * 100)}%` }} />
                </div>
                <p className="text-sm text-ink-subtle">
                  {planRulesSummary({ visitsPerCycle: usage.total, allowedWeekdays: usage.allowedWeekdays, cycle: active.plan.cycle })}
                  {" · "}Inclui: {serviceNames(usage.coveredServiceIds).join(", ")}. Os atendimentos não acumulam; cancelar devolve o atendimento e falta consome.
                </p>
              </section>
            )}

            {active.plan.benefits.length > 0 && (
              <section className="flex flex-col gap-3">
                <SectionTitle>Seus benefícios</SectionTitle>
                <ul className="flex flex-col gap-2 rounded-lg bg-card p-5 shadow-card">
                  {active.plan.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-[15px]">
                      <Check className="mt-0.5 size-4 shrink-0 text-cta-ink" aria-hidden />
                      {b}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : ordered.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Planos em breve"
            description="O Clube Moura está sendo preparado. Enquanto isso, agende seu horário."
            action={
              <Link href="/agendar" className={buttonVariants()}>
                Agendar horário
              </Link>
            }
          />
        ) : (
          <section aria-label="Planos" className="flex flex-col gap-4">
            {ordered.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={{ ...plan, coveredServiceNames: serviceNames(plan.coveredServiceIds) }}
                footer={
                  online ? (
                    <ClubActions mode="subscribe" planId={plan.id} highlighted={plan.highlighted} />
                  ) : (
                    <p className={cn("text-sm", plan.highlighted ? "text-on-dark/70" : "text-ink-subtle")}>
                      Assine direto na barbearia.
                    </p>
                  )
                }
              />
            ))}
            <p className="text-xs text-ink-subtle">
              Cobrança recorrente no cartão ou Pix Automático, processada pelo AbacatePay. Cancele quando quiser.
            </p>
          </section>
        )}

        {history.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionTitle>Pagamentos</SectionTitle>
            <ul className={rowGroupClass}>
              {history.map((p) => (
                <li key={p.id} className={staticRowClass}>
                  <div>
                    <p className="font-bold">{p.kind === "subscription" ? "Clube Moura" : "Agendamento"}</p>
                    <p className="text-ink-subtle">
                      {formatDay(p.paidAt)} · {paymentMethodLabel(p.method)}
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
