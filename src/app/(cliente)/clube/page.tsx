import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, Check, CreditCard, Crown, QrCode, Sparkles } from "lucide-react";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import { requireOnboardedUser } from "@/server/auth";
import { getMemberSubscription, listPlans, listUserPayments } from "@/server/payments/service";
import { getClubUsage } from "@/server/club-coverage";
import { listServices } from "@/server/catalog";
import { EmptyState, PageBody, PageHeader, SectionTitle } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { rowGroupClass, staticRowClass } from "@/lib/ui/classes";
import { formatPriceCents } from "@/lib/agenda/availability";
import { formatDayLong, formatDayMonth } from "@/lib/agenda/format";
import { paymentMethodLabel } from "@/lib/payments";
import { CYCLE_LABELS, planRulesSummary } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { PlanCard } from "@/components/club/plan-card";
import { billingMethodLabel, graceEndOf, nextChargeDate } from "@/lib/club-billing";
import { CancelSubscriptionButton, SubscriptionReturnToast } from "./club-actions";

export const metadata: Metadata = { title: "Clube" };

const formatDay = (date: Date | null) => (date ? formatDayMonth(date) : "—");

export default async function ClubePage() {
  const user = await requireOnboardedUser();
  const [db, env] = await Promise.all([getDb(), getServerEnv()]);
  const [plans, active, history, usage, services] = await Promise.all([
    listPlans(db),
    getMemberSubscription(db, user.id),
    listUserPayments(db, user.id),
    getClubUsage(db, user.id),
    listServices(db, { includeInactive: true }),
  ]);
  const serviceNames = (ids: string[]) => services.filter((s) => ids.includes(s.id)).map((s) => s.name);
  const online = Boolean(env.abacatePayApiKey);
  const ordered = [...plans].sort((a, b) => Number(b.highlighted) - Number(a.highlighted));
  const nextCharge = active ? nextChargeDate(active) : null;
  const pastDue = active?.status === "past_due";
  const graceEnd = active?.currentPeriodEnd ? graceEndOf(active.currentPeriodEnd) : null;

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
            {pastDue && graceEnd && (
              <section role="alert" className="flex items-start gap-3 rounded-lg bg-warning/12 p-4 text-[15px] text-warning-ink">
                <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
                <div className="flex flex-col gap-1">
                  <p className="font-bold">
                    {active.paymentMethod === "PIX" ? "O Pix da renovação não foi pago" : "Não conseguimos cobrar a renovação"}
                  </p>
                  <p>
                    Seus benefícios continuam até <strong>{formatDayLong(graceEnd)}</strong>.{" "}
                    {active.paymentMethod === "PIX"
                      ? "Pague o Pix ou use um cartão para continuar no clube."
                      : nextCharge
                        ? `Tentamos de novo em ${formatDayMonth(nextCharge)}, ou atualize o cartão agora.`
                        : "Atualize o cartão para continuar no clube."}
                  </p>
                </div>
              </section>
            )}
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
                <Badge variant="on-dark">{pastDue ? "Pagamento pendente" : active.cancelAtPeriodEnd ? "Cancelada" : "Ativa"}</Badge>
              </div>
              <div className="relative">
                <p className="text-2xl font-extrabold uppercase tracking-tight">{active.plan.name}</p>
                <p className="text-sm text-on-dark/70">{user.name}</p>
              </div>
              <div className="relative flex items-end justify-between gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wider text-on-dark/70">
                    {nextCharge ? "Próxima cobrança" : "Válida até"}
                  </p>
                  <p className="tabular font-bold">{formatDay(nextCharge ?? active.currentPeriodEnd)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-on-dark/70">{billingMethodLabel(active.paymentMethod, active.card)}</p>
                  <p className="tabular font-bold">
                    {formatPriceCents(active.priceCents ?? active.plan.priceCents)}/{CYCLE_LABELS[active.plan.cycle]}
                  </p>
                </div>
              </div>
            </section>

            {active.cancelAtPeriodEnd && active.currentPeriodEnd && (
              <p className="rounded-lg bg-card p-4 text-sm shadow-card">
                Assinatura cancelada: sem novas cobranças. Seus benefícios valem até{" "}
                <strong>{formatDayLong(active.currentPeriodEnd)}</strong>.
              </p>
            )}

            {(active.canChangeCard || active.pendingPixPaymentId) && !active.cancelAtPeriodEnd && (
              <div className="flex flex-col gap-2 sm:flex-row">
                {active.pendingPixPaymentId && (
                  <Link href={`/clube/pagar/${active.pendingPixPaymentId}`} className={buttonVariants({ size: "lg" })}>
                    <QrCode aria-hidden />
                    Pagar Pix da renovação
                  </Link>
                )}
                {active.canChangeCard && (
                  <Link
                    href="/clube/cartao"
                    className={buttonVariants({ size: "lg", variant: active.pendingPixPaymentId ? "outline" : "default" })}
                  >
                    <CreditCard aria-hidden />
                    {active.paymentMethod === "CARD" ? "Trocar cartão" : "Pagar com cartão"}
                  </Link>
                )}
              </div>
            )}

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
                    <Link
                      href={`/clube/assinar/${plan.id}`}
                      className={cn(buttonVariants({ size: "lg", variant: plan.highlighted ? "default" : "outline" }), "w-full")}
                    >
                      Assinar
                    </Link>
                  ) : (
                    <p className={cn("text-sm", plan.highlighted ? "text-on-dark/70" : "text-ink-subtle")}>
                      Assine direto na barbearia.
                    </p>
                  )
                }
              />
            ))}
            <p className="text-xs text-ink-subtle">
              Pague no cartão (cobrança automática a cada renovação) ou no Pix (enviado no seu WhatsApp 3 dias antes de
              renovar). Pagamentos processados pelo AbacatePay. Cancele quando quiser: o acesso vale até o fim do período pago.
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

        {active && !active.cancelAtPeriodEnd && active.paymentMethod !== "MANUAL" && active.currentPeriodEnd && (
          <div className="flex justify-center pt-4">
            <CancelSubscriptionButton
              subscriptionId={active.id}
              accessUntil={pastDue ? null : active.currentPeriodEnd.getTime()}
            />
          </div>
        )}
      </PageBody>
    </main>
  );
}
