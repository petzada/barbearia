import type { Metadata } from "next";
import { getDb } from "@/server/db";
import { requireBarberUser, toActor } from "@/server/auth";
import { listUpcomingBlocks } from "@/server/staff-agenda";
import { dayBoundsFor } from "@/server/agenda-page";
import { PageBody, PageHeader } from "@/components/page-header";
import { todayDateKeySP } from "@/lib/agenda/timezone";
import { BlocksList } from "./blocks-list";

export const metadata: Metadata = { title: "Bloqueios" };

export default async function BloqueiosPage() {
  const user = await requireBarberUser();
  const db = await getDb();
  const today = todayDateKeySP();
  const [blocks, bounds] = await Promise.all([
    listUpcomingBlocks(db, toActor(user), user.id),
    dayBoundsFor(db, today, user.id),
  ]);
  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Bloqueios" description="Folgas, almoço e férias." />
      <PageBody>
        <BlocksList
          barberId={user.id}
          today={today}
          openTime={bounds.openTime}
          closeTime={bounds.closeTime}
          blocks={blocks.map((b) => ({ id: b.id, startsAt: b.startsAt.getTime(), endsAt: b.endsAt.getTime(), note: b.note }))}
        />
      </PageBody>
    </main>
  );
}
