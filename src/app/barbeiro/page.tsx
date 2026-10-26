import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { getDb } from "@/server/db";
import { requireBarberUser, toActor } from "@/server/auth";
import { listAgendaForDay } from "@/server/scheduling";
import { getBarberEarnings } from "@/server/reports";
import { dayBoundsFor } from "@/server/agenda-page";
import { PageBody, PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/period-filter";
import { TodayTimeline } from "@/components/agenda/today-timeline";
import { toTimelineEntries } from "@/components/agenda/to-timeline";
import { buttonVariants } from "@/components/ui/button";
import { formatPriceCents, formatSlotTime } from "@/lib/agenda/availability";
import { formatDayLong } from "@/lib/agenda/format";
import { greetingSP, isPendingAppointment } from "@/lib/agenda/today";
import { todayDateKeySP } from "@/lib/agenda/timezone";
import { getFirstName } from "@/lib/profile/display-name";

export const metadata: Metadata = { title: "Hoje" };

export default async function BarbeiroHojePage() {
  const user = await requireBarberUser();
  const actor = toActor(user);
  const db = await getDb();
  const now = new Date();
  const today = todayDateKeySP(now);
  const [agenda, earnings, bounds] = await Promise.all([
    listAgendaForDay(db, actor, { dateKey: today, barberId: user.id }),
    getBarberEarnings(db, actor, user.id, { from: today, to: today }),
    dayBoundsFor(db, today, user.id),
  ]);
  // Só o que ainda precisa de ação: marcados (inclusive os que já começaram).
  const pending = agenda.filter(isPendingAppointment);
  const next = pending.find((e) => e.endsAt > now);

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        title="Hoje"
        description={`${greetingSP(now)}, ${getFirstName(user.name)}! ${formatDayLong(today)}.`}
        actions={
          <Link href="/barbeiro/agenda" className={buttonVariants({ size: "sm", variant: "outline" })}>
            <CalendarDays aria-hidden />
            Agenda
          </Link>
        }
      />
      <PageBody>
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Pendentes" value={String(pending.length)} />
          <StatTile label="Próximo" value={next ? formatSlotTime(next.startsAt) : "—"} />
          <StatTile label="Ganhos" value={formatPriceCents(earnings.totalCommissionCents)} tone="brand" />
        </div>
        {bounds.closedReason && (
          <p className="rounded-lg bg-warning/12 p-4 text-sm font-semibold text-warning-ink">Barbearia fechada hoje: {bounds.closedReason}.</p>
        )}
        <TodayTimeline
          entries={toTimelineEntries(pending)}
          openTime={bounds.openTime}
          closeTime={bounds.closeTime}
          isClosed={bounds.isClosed}
          initialNow={now.getTime()}
        />
      </PageBody>
    </main>
  );
}
