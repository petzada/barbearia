"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { BARBER_TIMEZONE } from "@/lib/agenda/availability";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

type MonthCalendarProps = {
  selected: string | null;
  onSelect: (dateKey: string) => void;
  year: number;
  month: number;
  /** Quando omitido, todos os dias do mês exibido são selecionáveis. */
  selectableKeys?: ReadonlySet<string>;
  canPrevMonth: boolean;
  canNextMonth: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return { year: y, month: m, day: d };
}

function dateKeyFromParts(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function weekdayOf(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

function formatMonthYear(year: number, month: number) {
  const utc = new Date(Date.UTC(year, month - 1, 1, 12));
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BARBER_TIMEZONE,
    month: "long",
    year: "numeric",
  }).format(utc);
}

export function MonthCalendar({
  selected,
  onSelect,
  year,
  month,
  selectableKeys,
  canPrevMonth,
  canNextMonth,
  onPrevMonth,
  onNextMonth,
}: MonthCalendarProps) {
  const totalDays = daysInMonth(year, month);
  const firstWeekday = weekdayOf(year, month, 1);
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: totalDays }, (_, i) =>
      dateKeyFromParts(year, month, i + 1),
    ),
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={!canPrevMonth}
          aria-label="Mês anterior"
          onClick={onPrevMonth}
          className="flex size-10 items-center justify-center rounded-full border border-hairline-strong text-ink-subtle transition-colors hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <p className="text-base font-bold capitalize">
          {formatMonthYear(year, month)}
        </p>
        <button
          type="button"
          disabled={!canNextMonth}
          aria-label="Próximo mês"
          onClick={onNextMonth}
          className="flex size-10 items-center justify-center rounded-full border border-hairline-strong text-ink-subtle transition-colors hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className="py-1 text-center text-xs text-ink-tertiary"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((key, i) => {
          if (!key) {
            return <span key={`empty-${i}`} aria-hidden />;
          }
          const enabled =
            selectableKeys === undefined || selectableKeys.has(key);
          const isSelected = selected === key;
          return (
            <button
              key={key}
              type="button"
              disabled={!enabled}
              onClick={() => {
                if (!enabled) return;
                onSelect(key);
              }}
              className={cn(
                "tabular mx-auto flex size-11 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                enabled && "hover:bg-surface-3",
                isSelected && enabled && "bg-cta text-cta-foreground",
                !enabled && "cursor-not-allowed text-ink-tertiary/40",
              )}
            >
              {parseDateKey(key).day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
