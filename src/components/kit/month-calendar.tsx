"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDayLong, formatMonthYear } from "@/lib/agenda/format";
import { todayDateKeySP } from "@/lib/agenda/timezone";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

const monthIndexOf = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return y * 12 + (m - 1);
};

/**
 * Calendário mensal único do app.
 * - `range`: limita a navegação aos meses entre `from` e `to` (inclusive a
 *   virada do ano) e só deixa tocar dias dentro dele; omita para navegar livre.
 * - `availableKeys`: dias com horário livre (destacados; os demais ficam
 *   desabilitados). `null` = carregando. Omita para não filtrar por disponibilidade.
 */
export function MonthCalendar({
  selected,
  onSelect,
  range,
  availableKeys,
  initialMonthKey,
}: {
  selected: string | null;
  onSelect: (dateKey: string) => void;
  range?: { from: string; to: string };
  availableKeys?: ReadonlySet<string> | null;
  /** Mês exibido ao abrir (padrão: o do dia selecionado ou o início do intervalo). */
  initialMonthKey?: string;
}) {
  const minIndex = range ? monthIndexOf(range.from) : -Infinity;
  const maxIndex = range ? monthIndexOf(range.to) : Infinity;
  const [view, setView] = useState(() =>
    monthIndexOf(initialMonthKey ?? selected ?? range?.from ?? todayDateKeySP()),
  );

  const year = Math.floor(view / 12);
  const month = (view % 12) + 1;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1, 12)).getUTCDay();
  const keyOf = (d: number) => `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const label = formatMonthYear(year, month);
  const loading = availableKeys === null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Mês anterior"
          disabled={view <= minIndex}
          onClick={() => setView((v) => Math.max(minIndex, v - 1))}
          className="text-ink-subtle"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Button>
        <p className="text-base font-bold" aria-live="polite">
          {label}
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Próximo mês"
          disabled={view >= maxIndex}
          onClick={() => setView((v) => Math.min(maxIndex, v + 1))}
          className="text-ink-subtle"
        >
          <ChevronRight className="size-5" aria-hidden />
        </Button>
      </div>
      {/* Grupo de botões (não `grid`): cada dia tem rótulo com a data completa. */}
      <div className="grid grid-cols-7 gap-1 text-center" role="group" aria-label={`Dias de ${label}`}>
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
          const inRange = !range || (key >= range.from && key <= range.to);
          const filtered = availableKeys !== undefined;
          const available = filtered && Boolean(availableKeys?.has(key)) && inRange;
          const enabled = filtered ? available : inRange;
          const isSelected = selected === key;
          return (
            <button
              key={key}
              type="button"
              data-date={key}
              data-available={available || undefined}
              disabled={!enabled}
              aria-pressed={isSelected}
              aria-label={`${formatDayLong(key)}${enabled ? (available ? ", com horários" : "") : filtered ? ", sem horários" : ", indisponível"}`}
              onClick={() => onSelect(key)}
              className={cn(
                "tabular mx-auto flex size-11 items-center justify-center rounded-full text-sm font-bold transition",
                isSelected
                  ? "bg-cta text-cta-foreground"
                  : available
                    ? "bg-teal-soft text-cta-ink hover:bg-cta/15"
                    : enabled
                      ? "hover:bg-muted"
                      : "text-ink-tertiary/50",
                loading && inRange && "animate-pulse bg-muted",
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
