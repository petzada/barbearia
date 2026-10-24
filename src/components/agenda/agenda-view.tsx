"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { formatAgendaDayHeader } from "@/lib/agenda/timeline";
import { todayDateKeySP } from "@/lib/agenda/timezone";
import { cn } from "@/lib/utils";
import { chipClass } from "@/lib/ui/classes";
import { BookingCalendarSheet } from "./booking-calendar-sheet";
import { AgendaDayTimeline, type TimelineEntry } from "./agenda-day-timeline";
import { EntrySheet } from "./entry-sheet";

function shiftDateKey(dateKey: string, days: number) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Agenda do dia (barbeiro ou admin): navegação por dia, filtro de barbeiro e ações. */
export function AgendaView({
  basePath,
  dateKey,
  entries,
  dayBounds,
  barbers,
  selectedBarberId,
}: {
  basePath: string;
  dateKey: string;
  entries: TimelineEntry[];
  dayBounds: { openTime: string; closeTime: string; isClosed: boolean };
  barbers?: { id: string; name: string }[];
  selectedBarberId?: string;
}) {
  const router = useRouter();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selected, setSelected] = useState<TimelineEntry | null>(null);
  const isToday = dateKey === todayDateKeySP();

  const href = (day: string, barberId = selectedBarberId) => {
    const params = new URLSearchParams({ dia: day });
    if (barberId) params.set("barbeiro", barberId);
    return `${basePath}?${params.toString()}`;
  };

  const appointments = entries.filter((e) => e.type === "appointment");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link href={href(shiftDateKey(dateKey, -1))} aria-label="Dia anterior" className={cn("flex size-11 items-center justify-center", chipClass)}>
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={() => setCalendarOpen(true)}
          className={cn("flex h-11 flex-1 items-center justify-center gap-2 px-3 capitalize", chipClass)}
        >
          <Calendar className="size-4 text-cta" aria-hidden />
          {isToday ? "Hoje, " : ""}
          {formatAgendaDayHeader(dateKey)}
        </button>
        <Link href={href(shiftDateKey(dateKey, 1))} aria-label="Próximo dia" className={cn("flex size-11 items-center justify-center", chipClass)}>
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      </div>

      {barbers && barbers.length > 0 && (
        <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:px-0">
          <Link href={`${basePath}?dia=${dateKey}`} aria-pressed={!selectedBarberId} className={cn("flex h-10 shrink-0 items-center px-4", chipClass)}>
            Todos
          </Link>
          {barbers.map((b) => (
            <Link
              key={b.id}
              href={href(dateKey, b.id)}
              aria-pressed={selectedBarberId === b.id}
              className={cn("flex h-10 shrink-0 items-center px-4", chipClass)}
            >
              {b.name}
            </Link>
          ))}
        </div>
      )}

      <p className="text-sm text-ink-subtle">
        {appointments.length === 0
          ? "Nenhum atendimento neste dia."
          : `${appointments.length} atendimento${appointments.length > 1 ? "s" : ""} · toque para ver ações`}
      </p>

      <BookingCalendarSheet
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        selected={dateKey}
        onSelect={(day) => router.push(href(day))}
      />

      <div className="rounded-lg bg-card p-3 shadow-card">
        <AgendaDayTimeline dateKey={dateKey} entries={entries} dayBounds={dayBounds} onSelect={setSelected} />
      </div>

      <EntrySheet entry={selected} onClose={() => setSelected(null)} showBarber={Boolean(barbers)} />
    </div>
  );
}
