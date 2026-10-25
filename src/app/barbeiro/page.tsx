import type { Metadata } from "next";
import { getDb } from "@/server/db";
import { requireBarberUser, toActor } from "@/server/auth";
import { listAgendaForDay } from "@/server/scheduling";
import { getBarberEarnings } from "@/server/reports";
import { getShopSettings } from "@/server/settings";
import { dayBoundsFor, sheetServices } from "@/server/agenda-page";
import { PageBody, PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/period-filter";
import { DayList } from "@/components/agenda/day-list";
import { toTimelineEntries } from "@/components/agenda/to-timeline";
import { formatPriceCents } from "@/lib/agenda/availability";
import { formatDayLong } from "@/lib/agenda/format";
import { todayDateKeySP } from "@/lib/agenda/timezone";
import { getFirstName } from "@/lib/profile/display-name";

export const metadata: Metadata = { title: "Hoje" };

export default async function BarbeiroHojePage() {
  const user = await requireBarberUser();
  const actor = toActor(user);
  const db = await getDb();
  const today = todayDateKeySP();
  const [agenda, earnings, bounds, settings, services] = await Promise.all([
    listAgendaForDay(db, actor, { dateKey: today, barberId: user.id }),
    getBarberEarnings(db, actor, user.id, { from: today, to: today }),
    dayBoundsFor(db, today, user.id),
    getShopSettings(db),
    sheetServices(db),
  ]);
  const appointments = agenda.filter((e) => e.type === "appointment" && e.status !== "cancelled");

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Hoje" description={`Oi, ${getFirstName(user.name)}! ${formatDayLong(today)}.`} />
      <PageBody>
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Agendados" value={String(appointments.length)} />
          <StatTile label="Concluídos" value={String(earnings.completedCount)} />
          <StatTile label="Ganhos" value={formatPriceCents(earnings.totalCommissionCents)} tone="brand" />
        </div>
        {bounds.closedReason && (
          <p className="rounded-lg bg-warning/12 p-4 text-sm font-semibold text-warning-ink">Barbearia fechada hoje: {bounds.closedReason}.</p>
        )}
        <DayList
          dateKey={today}
          entries={toTimelineEntries(agenda)}
          barber={{ id: user.id, name: user.name, ...bounds }}
          stepMinutes={settings.slotIntervalMinutes}
          services={services}
        />
      </PageBody>
    </main>
  );
}
