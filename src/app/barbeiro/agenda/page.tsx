import type { Metadata } from "next";
import { getDb } from "@/server/db";
import { requireBarberUser, toActor } from "@/server/auth";
import { listAgendaForDay } from "@/server/scheduling";
import { dayBoundsFor, resolveDateKey } from "@/server/agenda-page";
import { PageBody, PageHeader } from "@/components/page-header";
import { AgendaView } from "@/components/agenda/agenda-view";
import { toTimelineEntries } from "@/components/agenda/to-timeline";

export const metadata: Metadata = { title: "Minha agenda" };

export default async function BarbeiroAgendaPage({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const user = await requireBarberUser();
  const dateKey = resolveDateKey((await searchParams).dia);
  const db = await getDb();
  const [items, dayBounds] = await Promise.all([
    listAgendaForDay(db, toActor(user), { dateKey, barberId: user.id }),
    dayBoundsFor(db, dateKey),
  ]);
  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Agenda" />
      <PageBody>
        <AgendaView basePath="/barbeiro/agenda" dateKey={dateKey} entries={toTimelineEntries(items)} dayBounds={dayBounds} />
      </PageBody>
    </main>
  );
}
