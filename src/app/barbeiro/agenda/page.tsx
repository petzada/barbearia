import type { Metadata } from "next";
import { getDb } from "@/server/db";
import { requireBarberUser, toActor } from "@/server/auth";
import { listAgendaForDay } from "@/server/scheduling";
import { dayBoundsFor, resolveDateKey, sheetServices } from "@/server/agenda-page";
import { PageBody, PageHeader } from "@/components/page-header";
import { AgendaView } from "@/components/agenda/agenda-view";
import { toTimelineEntries } from "@/components/agenda/to-timeline";

export const metadata: Metadata = { title: "Minha agenda" };

export default async function BarbeiroAgendaPage({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const user = await requireBarberUser();
  const dateKey = resolveDateKey((await searchParams).dia);
  const db = await getDb();
  const [items, dayBounds, services] = await Promise.all([
    listAgendaForDay(db, toActor(user), { dateKey, barberId: user.id }),
    dayBoundsFor(db, dateKey, user.id),
    sheetServices(db),
  ]);
  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Agenda" />
      <PageBody>
        <AgendaView
          basePath="/barbeiro/agenda"
          dateKey={dateKey}
          services={services}
          columns={[{ barber: { id: user.id, name: user.name }, dayBounds, entries: toTimelineEntries(items) }]}
        />
      </PageBody>
    </main>
  );
}
