import type { Metadata } from "next";
import Link from "next/link";
import { Crown, Search } from "lucide-react";
import { getDb } from "@/server/db";
import { requireAdminUser, toActor } from "@/server/auth";
import { getClubOverview, type ClubFilter } from "@/server/club-admin";
import { listPlans } from "@/server/payments/service";
import { EmptyState, PageBody, PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/period-filter";
import { Input } from "@/components/ui/input";
import { formatPriceCents } from "@/lib/agenda/availability";
import { cn } from "@/lib/utils";
import { ClubMembers, RegisterButton } from "./club-admin-client";

export const metadata: Metadata = { title: "Clube" };

const FILTERS: { key: ClubFilter; label: string }[] = [
  { key: "ativos", label: "Ativos" },
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
  const [overview, plans] = await Promise.all([
    getClubOverview(db, toActor(user), { filter, search: params.q }),
    listPlans(db, { includeInactive: true }),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Clube" actions={<RegisterButton plans={plans.map((p) => ({ id: p.id, name: p.name, priceCents: p.priceCents }))} />} />
      <PageBody>
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Ativos" value={String(overview.activeCount)} />
          <StatTile label="Recorrente" value={formatPriceCents(overview.mrrCents)} hint="por mês" tone="brand" />
          <StatTile label="Vencendo" value={String(overview.expiringCount)} hint="em 7 dias" />
        </div>

        <form className="relative" role="search">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <input type="hidden" name="filtro" value={filter} />
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Buscar nome ou WhatsApp" className="pl-10" aria-label="Buscar assinante" />
        </form>

        <nav className="flex gap-2" aria-label="Filtrar assinantes">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/admin/clube?${new URLSearchParams({ filtro: f.key, ...(params.q ? { q: params.q } : {}) }).toString()}`}
              aria-pressed={filter === f.key}
              className={cn(
                "flex h-10 items-center rounded-md border border-hairline-strong bg-card px-4 text-sm font-semibold",
                "aria-pressed:border-cta aria-pressed:bg-cta aria-pressed:text-cta-foreground",
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>

        {overview.list.length === 0 ? (
          <EmptyState
            icon={Crown}
            title={filter === "ativos" ? "Nenhum assinante ainda" : "Nada por aqui"}
            description={filter === "ativos" ? "Cadastre os planos em Gestão › Planos e divulgue o clube." : undefined}
          />
        ) : (
          <ClubMembers
            rows={overview.list.map((r) => ({
              subscriptionId: r.subscriptionId,
              name: r.name,
              planName: r.planName,
              provider: r.provider,
              method: r.method,
              status: r.status,
              currentPeriodEnd: r.currentPeriodEnd?.getTime() ?? null,
            }))}
          />
        )}
      </PageBody>
    </main>
  );
}
