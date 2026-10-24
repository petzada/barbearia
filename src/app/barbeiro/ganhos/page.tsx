import type { Metadata } from "next";
import { Star } from "lucide-react";
import { getDb } from "@/server/db";
import { requireBarberUser, toActor } from "@/server/auth";
import { getBarberEarnings } from "@/server/reports";
import { listFeedbackHistory } from "@/server/feedback";
import { EmptyState, PageBody, PageHeader, SectionTitle } from "@/components/page-header";
import { PeriodFilter, StatTile } from "@/components/period-filter";
import { dateKeyFromIsoInSP, formatPriceCents, formatSelectableDay, formatSlotTime } from "@/lib/agenda/availability";
import { resolvePeriod } from "@/lib/periods";

export const metadata: Metadata = { title: "Ganhos" };

export default async function GanhosPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const user = await requireBarberUser();
  const actor = toActor(user);
  const period = resolvePeriod((await searchParams).periodo);
  const db = await getDb();
  const [earnings, feedback] = await Promise.all([
    getBarberEarnings(db, actor, user.id, period),
    listFeedbackHistory(db, actor, { barberId: user.id, limit: 5 }),
  ]);
  const avg = feedback.length ? feedback.reduce((s, f) => s + f.rating, 0) / feedback.length : null;

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Ganhos" description={`Comissão de ${user.commissionPercent}% sobre o preço de tabela.`} />
      <PageBody className="gap-8">
        <PeriodFilter basePath="/barbeiro/ganhos" current={period.key} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatTile label="Sua comissão" value={formatPriceCents(earnings.totalCommissionCents)} tone="brand" />
          <StatTile label="Atendimentos" value={String(earnings.completedCount)} hint={`${formatPriceCents(earnings.totalServicesCents)} em serviços`} />
          {avg != null && <StatTile label="Nota média" value={avg.toFixed(1)} hint={`últimas ${feedback.length} avaliações`} />}
        </div>

        <section className="flex flex-col gap-3">
          <SectionTitle>Atendimentos concluídos</SectionTitle>
          {earnings.items.length === 0 ? (
            <EmptyState title="Nenhum atendimento concluído no período" />
          ) : (
            <ul className="divide-y divide-hairline rounded-lg bg-card shadow-card">
              {earnings.items
                .slice()
                .reverse()
                .map((i) => (
                  <li key={i.id} className="flex items-center gap-3 px-5 py-4 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{i.serviceName ?? "Serviço"} · {i.clientName ?? "Cliente"}</p>
                      <p className="text-ink-subtle capitalize">
                        {formatSelectableDay(dateKeyFromIsoInSP(i.startsAt))} · {formatSlotTime(i.startsAt)}
                      </p>
                    </div>
                    <div className="tabular text-right">
                      <p className="font-bold text-cta">{formatPriceCents(i.commissionCents)}</p>
                      <p className="text-xs text-ink-subtle">de {formatPriceCents(i.priceCents)}</p>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </section>

        {feedback.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionTitle>Avaliações recentes</SectionTitle>
            <ul className="flex flex-col gap-2">
              {feedback.map((f) => (
                <li key={f.id} className="rounded-lg bg-card p-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{f.clientName}</p>
                    <span className="flex items-center gap-1 text-sm font-bold text-warning">
                      <Star className="size-4 fill-warning" aria-hidden />
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
