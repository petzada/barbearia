"use client";

import { useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import {
  BARBER_TIMEZONE,
  formatSlotTime,
  getQuickDayKeys,
  getSelectableDateKeys,
} from "@/lib/agenda/availability";
import { chipClass } from "@/lib/ui/classes";
import { cn } from "@/lib/utils";
import { BookingCalendarSheet } from "@/components/agenda/booking-calendar-sheet";
import { Skeleton } from "@/components/ui/skeleton";

function formatDayChip(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 12));
  const weekday = new Intl.DateTimeFormat("pt-BR", { timeZone: BARBER_TIMEZONE, weekday: "short" })
    .format(utc)
    .replace(".", "");
  return { weekday, day: d };
}

/** Agrupa horários em manhã / tarde / noite (SP). */
function groupSlots(slots: number[]) {
  const groups: { label: string; slots: number[] }[] = [
    { label: "Manhã", slots: [] },
    { label: "Tarde", slots: [] },
    { label: "Noite", slots: [] },
  ];
  for (const s of slots) {
    const hour = Number(formatSlotTime(s).slice(0, 2));
    groups[hour < 12 ? 0 : hour < 18 ? 1 : 2].slots.push(s);
  }
  return groups.filter((g) => g.slots.length > 0);
}

export function ScheduleStep({
  day,
  slots,
  pending,
  windowDays,
  onSelectDay,
  onSelectSlot,
}: {
  day: string | null;
  slots: number[];
  pending: boolean;
  windowDays: number;
  onSelectDay: (dateKey: string) => void;
  onSelectSlot: (slot: number) => void;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const quickDays = getQuickDayKeys(day, windowDays);
  const selectableKeys = useMemo(() => new Set(getSelectableDateKeys(windowDays)), [windowDays]);
  const groups = groupSlots(slots);

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-xl font-bold tracking-tight">Quando você quer vir?</h2>

      <div className="grid grid-cols-6 gap-2">
        {quickDays.map((dk) => {
          const { weekday, day: dayNum } = formatDayChip(dk);
          return (
            <button
              key={dk}
              type="button"
              aria-pressed={day === dk}
              onClick={() => onSelectDay(dk)}
              className={cn("group flex min-h-16 flex-col items-center justify-center gap-0.5", chipClass)}
            >
              <span className="text-[11px] font-semibold capitalize text-ink-subtle group-aria-pressed:text-cta-foreground/80">
                {weekday}
              </span>
              <span className="tabular text-lg font-bold">{dayNum}</span>
            </button>
          );
        })}
        <button
          type="button"
          aria-label="Abrir calendário"
          aria-expanded={calendarOpen}
          onClick={() => setCalendarOpen(true)}
          className={cn("flex min-h-16 items-center justify-center", chipClass)}
        >
          <Calendar className="size-5 text-ink-subtle" aria-hidden />
        </button>
      </div>

      <BookingCalendarSheet
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        selected={day}
        onSelect={onSelectDay}
        selectableKeys={selectableKeys}
      />

      {day && pending && (
        <div className="grid grid-cols-4 gap-2" aria-label="Carregando horários">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-12 rounded-md" />
          ))}
        </div>
      )}
      {day && !pending && slots.length === 0 && (
        <p className="rounded-lg bg-card p-5 text-center text-sm text-ink-subtle shadow-card">
          Nenhum horário livre neste dia. Tente outra data.
        </p>
      )}
      {day && !pending &&
        groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-subtle">{group.label}</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {group.slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSelectSlot(s)}
                  className={cn("tabular h-12", chipClass)}
                >
                  {formatSlotTime(s)}
                </button>
              ))}
            </div>
          </div>
        ))}
    </section>
  );
}
