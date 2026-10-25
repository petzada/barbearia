"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { formatAgendaDayHeader } from "@/lib/agenda/timeline";
import { todayDateKeySP } from "@/lib/agenda/timezone";
import { chipClass } from "@/lib/ui/classes";
import { cn } from "@/lib/utils";
import { BookingCalendarSheet } from "./booking-calendar-sheet";

export function shiftDateKey(dateKey: string, days: number) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** ‹ dia › + calendário (+ botão de encaixe/bloqueio opcional). */
export function DayNav({
  dateKey,
  hrefFor,
  onAdd,
}: {
  dateKey: string;
  hrefFor: (dateKey: string) => string;
  onAdd?: () => void;
}) {
  const router = useRouter();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const isToday = dateKey === todayDateKeySP();
  return (
    <div className="flex items-center gap-2">
      <Link href={hrefFor(shiftDateKey(dateKey, -1))} aria-label="Dia anterior" className={cn("flex size-11 shrink-0 items-center justify-center", chipClass)}>
        <ChevronLeft className="size-5" aria-hidden />
      </Link>
      <button
        type="button"
        onClick={() => setCalendarOpen(true)}
        className={cn("flex h-11 min-w-0 flex-1 items-center justify-center gap-2 px-3 capitalize", chipClass)}
      >
        <Calendar className="size-4 shrink-0 text-cta" aria-hidden />
        <span className="truncate">
          {isToday ? "Hoje, " : ""}
          {formatAgendaDayHeader(dateKey)}
        </span>
      </button>
      <Link href={hrefFor(shiftDateKey(dateKey, 1))} aria-label="Próximo dia" className={cn("flex size-11 shrink-0 items-center justify-center", chipClass)}>
        <ChevronRight className="size-5" aria-hidden />
      </Link>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          aria-label="Encaixe ou bloqueio"
          className="flex size-11 shrink-0 items-center justify-center rounded-md bg-cta text-cta-foreground shadow-card transition active:scale-95"
        >
          <Plus className="size-5" aria-hidden />
        </button>
      )}
      <BookingCalendarSheet
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        selected={dateKey}
        onSelect={(day) => router.push(hrefFor(day))}
      />
    </div>
  );
}
