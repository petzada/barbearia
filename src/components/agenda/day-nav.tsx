"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { formatDayLabel, formatDayMonth } from "@/lib/agenda/format";
import { todayDateKeySP } from "@/lib/agenda/timezone";
import { chipClass } from "@/lib/ui/classes";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBusyTransition } from "@/components/loading/busy";
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
  const [, startNavigation] = useBusyTransition();
  const isToday = dateKey === todayDateKeySP();
  return (
    <div className="flex items-center gap-2">
      <Link href={hrefFor(shiftDateKey(dateKey, -1))} aria-label="Dia anterior" className={buttonVariants({ variant: "outline", size: "icon-sm" })}>
        <ChevronLeft className="size-5" aria-hidden />
      </Link>
      <button
        type="button"
        onClick={() => setCalendarOpen(true)}
        aria-label="Escolher dia no calendário"
        className={cn("min-w-0 flex-1 gap-2 px-3", chipClass)}
      >
        <Calendar className="size-4 shrink-0 text-cta-ink" aria-hidden />
        <span className="truncate">{isToday ? `Hoje, ${formatDayMonth(dateKey)}` : formatDayLabel(dateKey)}</span>
      </button>
      <Link href={hrefFor(shiftDateKey(dateKey, 1))} aria-label="Próximo dia" className={buttonVariants({ variant: "outline", size: "icon-sm" })}>
        <ChevronRight className="size-5" aria-hidden />
      </Link>
      {onAdd && (
        <Button size="icon-sm" onClick={onAdd} aria-label="Encaixe ou bloqueio">
          <Plus className="size-5" aria-hidden />
        </Button>
      )}
      <BookingCalendarSheet
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        selected={dateKey}
        onSelect={(day) => startNavigation(() => router.push(hrefFor(day)))}
      />
    </div>
  );
}
