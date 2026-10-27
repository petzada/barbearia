import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, BarChart3, ChevronRight, QrCode, Users } from "lucide-react";
import { getDb } from "@/server/db";
import { requireAdminUser, toActor } from "@/server/auth";
import { getDashboard } from "@/server/reports";
import { getTodayOperation } from "@/server/staff-agenda";
import { EmptyState, PageBody, PageHeader, SectionTitle } from "@/components/page-header";
import { PeriodFilter, StatTile } from "@/components/period-filter";
import { BarberAvatar } from "@/components/booking/barber-avatar";
import { formatMinutesShort, formatPriceCents, formatSlotTime } from "@/lib/agenda/availability";
import { resolvePeriod } from "@/lib/periods";
import { rowGroupClass, staticRowClass } from "@/lib/ui/classes";
import { countLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "Painel" };

export default async function PainelPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const user = await requireAdminUser();
  const actor = toActor(user);
  const period = resolvePeriod((await searchParams).periodo);
  const db = await getDb();
  const [today, dash] = await Promise.all([getTodayOperation(db, actor), getDashboard(db, actor, period)]);
  const k = dash.kpis;
  const maxService = Math.max(1, ...dash.topServices.map((s) => s.revenueCents));

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Painel" />
      <PageBody className="gap-8">
        <section className="flex flex-col gap-3" aria-label="Operação de hoje">
          <SectionTitle
            action={
              <Link href="/admin/agenda" className="text-sm font-bold text-cta-ink">
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
                <p className="text-display">{today.occupancyPercent}%</p>
              </div>
              <p className="tabular text-right text-sm text-ink-subtle">
                {formatMinutesShort(today.bookedMinutes)} de {formatMinutesShort(today.availableMinutes)}
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
                      {b.next
                        ? `Próximo: ${formatSlotTime(b.next.startsAt)} · ${b.next.clientName}`
                        : b.availableMinutes === 0
                          ? "Sem expediente hoje"
                          : "Sem próximos atendimentos"}
                    </p>
                  </div>
                  {b.availableMinutes === 0 ? (
                    <span className="shrink-0 text-sm font-semibold text-ink-subtle">Folga</span>
                  ) : (
                    <div className="flex w-24 shrink-0 items-center gap-2">
                      <div
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-teal-soft"
                        role="meter"
                        aria-valuenow={b.occupancyPercent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Ocupação de ${b.name} hoje`}
                      >
                        <div className="h-full rounded-full bg-cta" style={{ width: `${b.occupancyPercent}%` }} />
                      </div>
                      <span className="tabular w-9 text-right text-sm font-bold">{b.occupancyPercent}%</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
          {(today.pendingCompletion > 0 || today.pendingPix > 0) && (
            <div className="flex flex-col gap-2">
              {today.pendingCompletion > 0 && (
                <Link href="/admin/agenda" className="flex items-center gap-3 rounded-lg bg-warning/12 p-4 text-sm font-semibold text-warning-ink">
                  <AlertCircle className="size-5 shrink-0" aria-hidden />
                  <span className="flex-1">
                    {countLabel(today.pendingCompletion, "atendimento", "atendimentos")} sem conclusão
                  </span>
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              )}
              {today.pendingPix > 0 && (
                <Link href="/admin/financeiro?aba=recebimentos" className="flex items-center gap-3 rounded-lg bg-card p-4 text-sm font-semibold shadow-card">
                  <QrCode className="size-5 shrink-0 text-cta-ink" aria-hidden />
                  <span className="flex-1">{today.pendingPix} Pix aguardando pagamento</span>
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
            <StatTile label="Atendimentos" value={String(k.completedCount)} hint={countLabel(k.noShowCount, "falta", "faltas")} />
            <StatTile label="Assinantes" value={String(k.activeSubscribers)} hint="ativos" />
            <StatTile label="Nota média" value={k.averageRating != null ? k.averageRating.toFixed(1).replace(".", ",") : "—"} hint={countLabel(k.ratingsCount, "avaliação", "avaliações")} />
            <StatTile label="Cancelamentos" value={String(k.cancelledCount)} />
          </div>
        </section>

        <div className="grid gap-6 *:min-w-0 lg:grid-cols-2">
          <section className="flex flex-col gap-3">
            <SectionTitle>Serviços mais vendidos</SectionTitle>
            {dash.topServices.length === 0 ? (
              <EmptyState compact icon={BarChart3} title="Sem atendimentos concluídos no período" />
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
              <EmptyState compact icon={Users} title="Sem atendimentos concluídos no período" />
            ) : (
              <ul className={rowGroupClass}>
                {dash.byBarber.map((b) => (
                  <li key={b.barberId} className={staticRowClass}>
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{b.name}</span>
                      <span className="text-ink-subtle">{countLabel(b.completed, "atendimento", "atendimentos")}</span>
                    </span>
                    <span className="tabular shrink-0 text-right">
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
