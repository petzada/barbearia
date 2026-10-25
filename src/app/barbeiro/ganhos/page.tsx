import type { Metadata } from "next";
import { Star, Wallet } from "lucide-react";
import { getDb } from "@/server/db";
import { requireBarberUser, toActor } from "@/server/auth";
import { eachDateKey, getBarberEarnings } from "@/server/reports";
import { listFeedbackHistory } from "@/server/feedback";
import { getBarberPayoutStatus, listPayouts, PAYOUT_METHOD_LABELS, type PayoutMethod } from "@/server/payouts";
import { EmptyState, PageBody, PageHeader, SectionTitle } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { DailyBarChart } from "@/components/charts/daily-bar-chart";
import { dateKeyFromIsoInSP, formatPriceCents, formatSelectableDay, formatSlotTime } from "@/lib/agenda/availability";
import { PERIOD_OPTIONS, resolvePeriod } from "@/lib/periods";
import { countLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "Ganhos" };

export default async function GanhosPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const user = await requireBarberUser();
  const actor = toActor(user);
  const period = resolvePeriod((await searchParams).periodo);
  const db = await getDb();
  const [earnings, payout, payouts, feedback] = await Promise.all([
    getBarberEarnings(db, actor, user.id, period),
    getBarberPayoutStatus(db, actor, user.id, period),
    listPayouts(db, actor, { barberId: user.id, limit: 3 }),
    listFeedbackHistory(db, actor, { barberId: user.id, limit: 5 }),
  ]);

  const byDay = new Map<string, typeof earnings.items>();
  for (const item of earnings.items) {
    const key = dateKeyFromIsoInSP(item.startsAt);
    byDay.set(key, [...(byDay.get(key) ?? []), item]);
  }
  const chart = eachDateKey(period).map((dateKey) => ({
    dateKey,
    valueCents: (byDay.get(dateKey) ?? []).reduce((s, i) => s + i.commissionCents, 0),
  }));
  const periodLabel = PERIOD_OPTIONS.find((p) => p.key === period.key)?.label.toLowerCase() ?? "";

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Ganhos" />
      <PageBody className="gap-7">
        <PeriodFilter basePath="/barbeiro/ganhos" current={period.key} />

        <section className="flex flex-col gap-1 rounded-lg bg-card p-5 shadow-card">
          <p className="text-sm font-semibold text-ink-subtle">Sua comissão · {periodLabel}</p>
          <p className="text-[44px] font-extrabold leading-none tracking-tight">{formatPriceCents(earnings.totalCommissionCents)}</p>
          <p className="text-sm text-ink-subtle">
            {earnings.completedCount} atendimento{earnings.completedCount === 1 ? "" : "s"} · {user.commissionPercent}% de{" "}
            {formatPriceCents(earnings.totalServicesCents)}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-hairline pt-4 text-sm">
            <div>
              <dt className="text-ink-subtle">Recebido</dt>
              <dd className="tabular font-bold text-success">{formatPriceCents(payout.receivedCents)}</dd>
            </div>
            <div>
              <dt className="text-ink-subtle">A receber</dt>
              <dd className="tabular font-bold">{formatPriceCents(payout.toReceiveCents)}</dd>
            </div>
          </dl>
          {payout.pendingAllTimeCents > payout.toReceiveCents && (
            <p className="mt-2 text-xs text-ink-subtle">
              Total a receber de todos os períodos: {formatPriceCents(payout.pendingAllTimeCents)}
            </p>
          )}
        </section>

        {chart.length > 1 && (
          <section className="flex flex-col gap-3">
            <SectionTitle>Comissão por dia</SectionTitle>
            <div className="rounded-lg bg-card p-4 shadow-card">
              <DailyBarChart data={chart} label="Comissão por dia no período" />
            </div>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <SectionTitle>Extrato</SectionTitle>
          {earnings.items.length === 0 ? (
            <EmptyState icon={Wallet} title="Nenhum atendimento concluído no período" />
          ) : (
            [...byDay.entries()].reverse().map(([dateKey, items]) => (
              <div key={dateKey} className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1 text-xs font-bold uppercase tracking-wider text-ink-subtle">
                  <span>{formatSelectableDay(dateKey)}</span>
                  <span className="tabular">{formatPriceCents(items.reduce((s, i) => s + i.commissionCents, 0))}</span>
                </div>
                <ul className="divide-y divide-hairline rounded-lg bg-card shadow-card">
                  {items.map((i) => (
                    <li key={i.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <span className="tabular w-12 shrink-0 text-ink-subtle">{formatSlotTime(i.startsAt)}</span>
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {i.serviceName ?? "Serviço"} · {i.clientName ?? "Cliente"}
                      </span>
                      <span className="tabular font-bold">{formatPriceCents(i.commissionCents)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>

        {payouts.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionTitle>Últimos repasses</SectionTitle>
            <ul className="divide-y divide-hairline rounded-lg bg-card shadow-card">
              {payouts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>
                    <span className="block font-semibold">
                      {formatSelectableDay(p.periodFrom)} – {formatSelectableDay(p.periodTo)}
                    </span>
                    <span className="text-ink-subtle">
                      {PAYOUT_METHOD_LABELS[p.method as PayoutMethod] ?? p.method} · {countLabel(p.entriesCount, "atendimento", "atendimentos")}
                    </span>
                  </span>
                  <span className="tabular font-bold text-success">{formatPriceCents(p.amountCents)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {feedback.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionTitle>Avaliações recentes</SectionTitle>
            <ul className="flex flex-col gap-2">
              {feedback.map((f) => (
                <li key={f.id} className="rounded-lg bg-card p-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{f.clientName}</p>
                    <span className="flex items-center gap-1 text-sm font-bold text-ink" aria-label={`${f.rating} de 5`}>
                      <Star className="size-4 fill-warning text-warning" aria-hidden />
                      {f.rating}
                    </span>
                  </div>
                  {f.comment && <p className="mt-1 text-sm text-ink-muted">“{f.comment}”</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </PageBody>
    </main>
  );
}
