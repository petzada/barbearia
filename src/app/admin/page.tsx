import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ChevronRight, QrCode } from "lucide-react";
import { getDb } from "@/server/db";
import { requireAdminUser, toActor } from "@/server/auth";
import { getDashboard } from "@/server/reports";
import { getTodayOperation } from "@/server/staff-agenda";
import { PageBody, PageHeader, SectionTitle } from "@/components/page-header";
import { PeriodFilter, StatTile } from "@/components/period-filter";
import { DailyBarChart } from "@/components/charts/daily-bar-chart";
import { BarberAvatar } from "@/components/booking/barber-avatar";
import { formatPriceCents, formatSlotTime } from "@/lib/agenda/availability";
import { resolvePeriod } from "@/lib/periods";

export const metadata: Metadata = { title: "Painel" };

export default async function PainelPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const user = await requireAdminUser();
  const actor = toActor(user);
  const period = resolvePeriod((await searchParams).periodo);
  const db = await getDb();
  const [today, dash] = await Promise.all([getTodayOperation(db, actor), getDashboard(db, actor, period)]);
  const k = dash.kpis;
  const chart = dash.revenueByDay.map((d) => ({ dateKey: d.dateKey, valueCents: d.servicesCents + d.subscriptionsCents }));
  const maxService = Math.max(1, ...dash.topServices.map((s) => s.revenueCents));

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Painel" />
      <PageBody className="gap-8">
        <section className="flex flex-col gap-3" aria-label="Operação de hoje">
          <SectionTitle
            action={
              <Link href="/admin/agenda" className="text-sm font-bold text-cta">
                Abrir agenda
              </Link>
            }
          >
            Hoje
          </SectionTitle>
          <div className="flex flex-col gap-4 rounded-lg bg-card p-5 shadow-card">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink-subtle">Ocupação</p>
                <p className="text-[40px] font-extrabold leading-none tracking-tight">{today.occupancyPercent}%</p>
              </div>
              <p className="tabular text-right text-sm text-ink-subtle">
                {Math.round(today.bookedMinutes / 60)}h de {Math.round(today.availableMinutes / 60)}h
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-teal-soft" role="meter" aria-valuenow={today.occupancyPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Ocupação de hoje">
              <div className="h-full rounded-full bg-cta" style={{ width: `${today.occupancyPercent}%` }} />
            </div>
            <ul className="flex flex-col divide-y divide-hairline">
              {today.barbers.map((b) => (
                <li key={b.id} className="flex items-center gap-3 py-3 first:pt-1 last:pb-0">
                  <BarberAvatar name={b.name} image={b.image} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{b.name}</p>
                    <p className="truncate text-sm text-ink-subtle">
                      {b.isClosed
                        ? "Folga hoje"
                        : b.next
                          ? `Próximo: ${formatSlotTime(b.next.startsAt)} · ${b.next.clientName}`
                          : "Sem próximos atendimentos"}
                    </p>
                  </div>
                  <span className="tabular text-sm font-bold text-ink-subtle">{b.appointments}</span>
                </li>
              ))}
            </ul>
          </div>
          {(today.pendingCompletion > 0 || today.pendingPix > 0) && (
            <div className="flex flex-col gap-2">
              {today.pendingCompletion > 0 && (
                <Link href="/admin/agenda" className="flex items-center gap-3 rounded-lg bg-warning/12 p-4 text-sm font-semibold text-warning">
                  <AlertCircle className="size-5 shrink-0" aria-hidden />
                  <span className="flex-1">
                    {today.pendingCompletion} atendimento{today.pendingCompletion > 1 ? "s" : ""} sem conclusão
                  </span>
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              )}
              {today.pendingPix > 0 && (
                <Link href="/admin/financeiro?aba=recebimentos" className="flex items-center gap-3 rounded-lg bg-card p-4 text-sm font-semibold shadow-card">
                  <QrCode className="size-5 shrink-0 text-cta" aria-hidden />
                  <span className="flex-1">
                    {today.pendingPix} Pix aguardando pagamento
                  </span>
                  <ChevronRight className="size-4 text-ink-tertiary" aria-hidden />
                </Link>
              )}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4" aria-label="Indicadores do período">
          <PeriodFilter basePath="/admin" current={period.key} />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatTile label="Faturamento" value={formatPriceCents(k.servicesRevenueCents + k.subscriptionRevenueCents)} hint="serviços + clube" tone="brand" />
            <StatTile label="Ticket médio" value={formatPriceCents(k.averageTicketCents)} />
            <StatTile label="Atendimentos" value={String(k.completedCount)} hint={`${k.noShowCount} falta${k.noShowCount === 1 ? "" : "s"}`} />
            <StatTile label="Assinantes" value={String(k.activeSubscribers)} hint="ativos" />
            <StatTile label="Nota média" value={k.averageRating != null ? k.averageRating.toFixed(1).replace(".", ",") : "—"} hint={`${k.ratingsCount} avaliações`} />
            <StatTile label="Cancelamentos" value={String(k.cancelledCount)} />
          </div>
        </section>

        {chart.length > 1 && (
          <section className="flex flex-col gap-3">
            <SectionTitle>Faturamento por dia</SectionTitle>
            <div className="rounded-lg bg-card p-4 shadow-card">
              <DailyBarChart data={chart} label="Faturamento (serviços concluídos + clube) por dia" />
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="flex flex-col gap-3">
            <SectionTitle>Serviços mais vendidos</SectionTitle>
            {dash.topServices.length === 0 ? (
              <p className="rounded-lg bg-card p-5 text-sm text-ink-subtle shadow-card">Sem atendimentos concluídos no período.</p>
            ) : (
              <ul className="flex flex-col gap-3 rounded-lg bg-card p-5 shadow-card">
                {dash.topServices.map((s) => (
                  <li key={s.name} className="flex flex-col gap-1.5">
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="font-semibold">{s.name}</span>
                      <span className="tabular text-ink-subtle">
                        {s.count}× · {formatPriceCents(s.revenueCents)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-chart-1" style={{ width: `${(s.revenueCents / maxService) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="flex flex-col gap-3">
            <SectionTitle>Por barbeiro</SectionTitle>
            {dash.byBarber.length === 0 ? (
              <p className="rounded-lg bg-card p-5 text-sm text-ink-subtle shadow-card">Sem atendimentos concluídos no período.</p>
            ) : (
              <ul className="divide-y divide-hairline rounded-lg bg-card shadow-card">
                {dash.byBarber.map((b) => (
                  <li key={b.barberId} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span>
                      <span className="block font-bold">{b.name}</span>
                      <span className="text-ink-subtle">{b.completed} atendimentos</span>
                    </span>
                    <span className="tabular text-right">
                      <span className="block font-bold">{formatPriceCents(b.revenueCents)}</span>
                      <span className="text-xs text-ink-subtle">comissão {formatPriceCents(b.commissionCents)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </PageBody>
    </main>
  );
}
