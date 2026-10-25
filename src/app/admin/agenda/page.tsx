import type { Metadata } from "next";
import { getDb } from "@/server/db";
import { requireAdminUser, toActor } from "@/server/auth";
import { listAgendaForDay } from "@/server/scheduling";
import { listBarbers } from "@/server/team";
import { dayBoundsFor, resolveDateKey, sheetServices } from "@/server/agenda-page";
import Link from "next/link";
import { EmptyState, PageBody, PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { AgendaView } from "@/components/agenda/agenda-view";
import { toTimelineEntries } from "@/components/agenda/to-timeline";
import { Users } from "lucide-react";

export const metadata: Metadata = { title: "Agenda" };

export default async function AdminAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string; barbeiro?: string }>;
}) {
  const user = await requireAdminUser();
  const params = await searchParams;
  const dateKey = resolveDateKey(params.dia);
  const db = await getDb();
  const [barbers, items, services] = await Promise.all([
    listBarbers(db),
    listAgendaForDay(db, toActor(user), { dateKey }),
    sheetServices(db),
  ]);
  const bounds = await Promise.all(barbers.map((b) => dayBoundsFor(db, dateKey, b.id)));
  const columns = barbers.map((b, i) => ({
    barber: { id: b.id, name: b.name },
    dayBounds: bounds[i],
    entries: toTimelineEntries(items.filter((e) => e.barberId === b.id)),
  }));
  const selected = barbers.some((b) => b.id === params.barbeiro) ? params.barbeiro : undefined;

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Agenda" />
      <PageBody>
        {columns.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum barbeiro na equipe"
            description="Adicione barbeiros para montar a agenda."
            action={
              <Link href="/admin/gestao/equipe" className={buttonVariants({ size: "lg" })}>
                Abrir equipe
              </Link>
            }
          />
        ) : (
          <AgendaView
            basePath="/admin/agenda"
            dateKey={dateKey}
            columns={columns}
            services={services}
            selectedBarberId={selected}
            showBarberFilter
          />
        )}
      </PageBody>
    </main>
  );
}
