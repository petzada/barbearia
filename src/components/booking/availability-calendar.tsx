"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BARBER_TIMEZONE } from "@/lib/agenda/availability";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

const monthIndex = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return y * 12 + (m - 1);
};

function monthLabel(index: number) {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: BARBER_TIMEZONE, month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, 1, 12)),
  );
}

/**
 * Calendário mensal sempre aberto do agendamento.
 * - `windowKeys`: dias da janela de agendamento (navegação limitada a esses meses);
 * - `availableKeys`: dias com horário livre (destacados e tocáveis); `null` = carregando.
 */
export function AvailabilityCalendar({
  windowKeys,
  availableKeys,
  selected,
  onSelect,
}: {
  windowKeys: string[];
  availableKeys: ReadonlySet<string> | null;
  selected: string | null;
  onSelect: (dateKey: string) => void;
}) {
  const first = windowKeys[0];
  const last = windowKeys[windowKeys.length - 1];
  const minIndex = monthIndex(first);
  const maxIndex = monthIndex(last);
  const [view, setView] = useState(() => (selected ? monthIndex(selected) : minIndex));

  const year = Math.floor(view / 12);
  const month = (view % 12) + 1;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1, 12)).getUTCDay();
  const keyOf = (d: number) => `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const inWindow = new Set(windowKeys);

  return (
    <div className="rounded-lg bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Mês anterior"
          disabled={view <= minIndex}
          onClick={() => setView((v) => Math.max(minIndex, v - 1))}
          className="flex size-10 items-center justify-center rounded-full text-ink-subtle transition hover:bg-muted disabled:opacity-30"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <p className="text-base font-bold capitalize" aria-live="polite">
          {monthLabel(view)}
        </p>
        <button
          type="button"
          aria-label="Próximo mês"
          disabled={view >= maxIndex}
          onClick={() => setView((v) => Math.min(maxIndex, v + 1))}
          className="flex size-10 items-center justify-center rounded-full text-ink-subtle transition hover:bg-muted disabled:opacity-30"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label={`Dias de ${monthLabel(view)}`}>
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="py-1 text-xs font-bold text-ink-tertiary" aria-hidden>
            {w}
          </span>
        ))}
        {Array.from({ length: firstWeekday }, (_, i) => (
          <span key={`e${i}`} aria-hidden />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const key = keyOf(day);
          const available = Boolean(availableKeys?.has(key)) && inWindow.has(key);
          const isSelected = selected === key;
          return (
            <button
              key={key}
              type="button"
              data-date={key}
              data-available={available || undefined}
              disabled={!available}
              aria-pressed={isSelected}
              aria-label={`${day}${available ? "" : ", sem horários"}`}
              onClick={() => onSelect(key)}
              className={cn(
                "tabular mx-auto flex size-11 items-center justify-center rounded-full text-sm font-bold transition",
                isSelected
                  ? "bg-cta text-cta-foreground"
                  : available
                    ? "bg-teal-soft text-cta hover:bg-cta/15"
                    : "text-ink-tertiary/50",
                availableKeys === null && inWindow.has(key) && "animate-pulse bg-muted",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
