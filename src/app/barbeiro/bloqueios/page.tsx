import type { Metadata } from "next";
import { getDb } from "@/server/db";
import { requireBarberUser, toActor } from "@/server/auth";
import { listAgendaForDay } from "@/server/scheduling";
import { dayBoundsFor, resolveDateKey } from "@/server/agenda-page";
import { PageBody, PageHeader } from "@/components/page-header";
import { BlocksPanel } from "@/components/agenda/blocks-panel";

export const metadata: Metadata = { title: "Bloqueios" };

export default async function BloqueiosPage({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const user = await requireBarberUser();
  const dateKey = resolveDateKey((await searchParams).dia);
  const db = await getDb();
  const [items, dayBounds] = await Promise.all([
    listAgendaForDay(db, toActor(user), { dateKey, barberId: user.id }),
    dayBoundsFor(db, dateKey),
  ]);
  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Bloqueios" description="Reserve horários em que você não atende." />
      <PageBody>
        <BlocksPanel
          basePath="/barbeiro/bloqueios"
          barberId={user.id}
          dateKey={dateKey}
          dayBounds={dayBounds}
          blocks={items
            .filter((i) => i.type === "block")
            .map((b) => ({ id: b.id, startsAt: b.startsAt.toISOString(), endsAt: b.endsAt.toISOString(), note: b.note }))}
        />
      </PageBody>
    </main>
  );
}
