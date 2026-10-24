"use client";

import { useState } from "react";
import { getInitialCalendarViewInSP } from "@/lib/agenda/availability";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { MonthCalendar } from "./month-calendar";

type BookingCalendarSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: string | null;
  onSelect: (dateKey: string) => void;
  /** Quando omitido, qualquer dia do mês/ano navegável fica selecionável (agenda do barbeiro). */
  selectableKeys?: ReadonlySet<string>;
};

function monthFromDateKey(key: string) {
  return Number(key.split("-")[1]);
}

function yearFromDateKey(key: string) {
  return Number(key.split("-")[0]);
}

function resolveInitialView(selected: string | null): { year: number; month: number } {
  if (selected) {
    return {
      year: yearFromDateKey(selected),
      month: monthFromDateKey(selected),
    };
  }
  return getInitialCalendarViewInSP();
}

function BookingCalendarSheetBody({
  selected,
  onSelect,
  selectableKeys,
}: {
  selected: string | null;
  onSelect: (dateKey: string) => void;
  selectableKeys?: ReadonlySet<string>;
}) {
  const unrestricted = selectableKeys === undefined;
  const initial = resolveInitialView(selected);
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);

  // Com dias restritos, navega só entre os meses que têm dia selecionável
  // (a janela pode cruzar a virada do ano).
  const monthIndex = (y: number, m: number) => y * 12 + (m - 1);
  const keys = selectableKeys ? [...selectableKeys].sort() : [];
  const minIndex = keys.length ? monthIndex(yearFromDateKey(keys[0]), monthFromDateKey(keys[0])) : -Infinity;
  const maxIndex = keys.length
    ? monthIndex(yearFromDateKey(keys[keys.length - 1]), monthFromDateKey(keys[keys.length - 1]))
    : Infinity;
  const current = monthIndex(viewYear, viewMonth);

  function shift(delta: number) {
    const next = current + delta;
    setViewYear(Math.floor(next / 12));
    setViewMonth((next % 12) + 1);
  }

  const canPrevMonth = unrestricted || current > minIndex;
  const canNextMonth = unrestricted || current < maxIndex;
  const goPrevMonth = () => canPrevMonth && shift(-1);
  const goNextMonth = () => canNextMonth && shift(1);

  return (
    <MonthCalendar
      selected={selected}
      onSelect={onSelect}
      year={viewYear}
      month={viewMonth}
      selectableKeys={selectableKeys}
      canPrevMonth={canPrevMonth}
      canNextMonth={canNextMonth}
      onPrevMonth={goPrevMonth}
      onNextMonth={goNextMonth}
    />
  );
}

export function BookingCalendarSheet({
  open,
  onOpenChange,
  selected,
  onSelect,
  selectableKeys,
}: BookingCalendarSheetProps) {
  function handleSelect(dateKey: string) {
    onSelect(dateKey);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[85vh] rounded-t-[28px] border-0 bg-card px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5"
      >
        <SheetTitle className="sr-only">Escolher data</SheetTitle>
        {open ? (
          <BookingCalendarSheetBody
            key={selected ?? "none"}
            selected={selected}
            onSelect={handleSelect}
            selectableKeys={selectableKeys}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
