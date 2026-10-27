import type { Metadata } from "next";
import Link from "next/link";
import { Crown, Search, X } from "lucide-react";
import { getDb } from "@/server/db";
import { requireAdminUser, toActor } from "@/server/auth";
import { getActiveSubscribersByMonth, getClubOverview, type ClubFilter } from "@/server/club-admin";
import { listPlans } from "@/server/payments/service";
import { EmptyState, PageBody, PageHeader, SectionTitle } from "@/components/page-header";
import { MonthlyCountChart } from "@/components/charts/daily-bar-chart";
import { StatTile } from "@/components/period-filter";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chipClass, chipRowClass } from "@/lib/ui/classes";
import { formatPriceCents } from "@/lib/agenda/availability";
import { cn } from "@/lib/utils";
import { nextChargeDate } from "@/lib/club-billing";
import { ClubMembers, RegisterButton } from "./club-admin-client";

export const metadata: Metadata = { title: "Clube" };

const FILTERS: { key: ClubFilter; label: string }[] = [
  { key: "ativos", label: "Ativos" },
  { key: "pendentes", label: "Pagamento pendente" },
  { key: "vencendo", label: "Vencendo" },
  { key: "cancelados", label: "Cancelados" },
];

export default async function AdminClubePage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; q?: string }>;
}) {
  const params = await searchParams;
  const filter = FILTERS.some((f) => f.key === params.filtro) ? (params.filtro as ClubFilter) : "ativos";
  const user = await requireAdminUser();
  const db = await getDb();
  const actor = toActor(user);
  const [overview, plans, byMonth] = await Promise.all([
    getClubOverview(db, actor, { filter, search: params.q }),
    listPlans(db, { includeInactive: true }),
    getActiveSubscribersByMonth(db, actor),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Clube" actions={<RegisterButton plans={plans.map((p) => ({ id: p.id, name: p.name, priceCents: p.priceCents }))} />} />
      <PageBody>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Ativos" value={String(overview.activeCount)} />
          <StatTile label="Recorrente" value={formatPriceCents(overview.mrrCents)} hint="por mês" tone="brand" />
          <StatTile label="Pendentes" value={String(overview.pastDueCount)} hint="pagamento" />
          <StatTile label="Vencendo" value={String(overview.expiringCount)} hint="em 7 dias" />
        </div>

        <section className="flex flex-col gap-3">
          <SectionTitle>Assinantes ativos</SectionTitle>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <MonthlyCountChart data={byMonth} label="Assinantes ativos no fim de cada mês, últimos 6 meses (mês atual: hoje)" />
          </div>
        </section>

        <form className="relative" role="search">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <input type="hidden" name="filtro" value={filter} />
          <Input
            name="q"
            type="search"
            defaultValue={params.q ?? ""}
            placeholder="Buscar nome ou WhatsApp"
            className={cn("pl-10", params.q && "pr-12")}
            aria-label="Buscar assinante"
          />
          {params.q && (
            <Link
              href={`/admin/clube?filtro=${filter}`}
              aria-label="Limpar busca"
              className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "absolute right-0 top-1/2 -translate-y-1/2")}
            >
              <X aria-hidden />
            </Link>
          )}
        </form>

        <nav className={chipRowClass} aria-label="Filtrar assinantes">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/admin/clube?${new URLSearchParams({ filtro: f.key, ...(params.q ? { q: params.q } : {}) }).toString()}`}
              aria-current={filter === f.key ? "true" : undefined}
              className={cn("px-4", chipClass)}
            >
              {f.label}
            </Link>
          ))}
        </nav>

        {overview.list.length === 0 ? (
          params.q ? (
            <EmptyState
              compact
              icon={Search}
              title="Ninguém encontrado"
              description={`Nenhum assinante com “${params.q}”.`}
              action={
                <Link href={`/admin/clube?filtro=${filter}`} className={buttonVariants({ variant: "outline" })}>
                  Limpar busca
                </Link>
              }
            />
          ) : filter === "ativos" ? (
            <EmptyState
              icon={Crown}
              title="Nenhum assinante ainda"
              description="Cadastre os planos e divulgue o clube."
              action={
                <Link href="/admin/gestao/planos" className={buttonVariants({ size: "lg" })}>
                  Abrir planos
                </Link>
              }
            />
          ) : (
            <EmptyState
              compact
              icon={Crown}
              title={
                filter === "vencendo"
                  ? "Nenhuma assinatura vencendo"
                  : filter === "pendentes"
                    ? "Nenhum pagamento pendente"
                    : "Nenhuma assinatura cancelada"
              }
            />
          )
        ) : (
          <ClubMembers
            rows={overview.list.map((r) => ({
              subscriptionId: r.subscriptionId,
              name: r.name,
              planName: r.planName,
              paymentMethod: r.paymentMethod,
              cardLastFour: r.cardLastFour,
              status: r.status,
              cancelAtPeriodEnd: r.cancelAtPeriodEnd,
              currentPeriodEnd: r.currentPeriodEnd?.getTime() ?? null,
              nextChargeAt: nextChargeDate(r)?.getTime() ?? null,
            }))}
          />
        )}
      </PageBody>
    </main>
  );
}
