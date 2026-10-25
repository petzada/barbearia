"use client";

import { useMemo, useState } from "react";
import { CalendarOff, ChevronRight, Plus } from "lucide-react";
import { buildDayRows } from "@/lib/agenda/day-slots";
import { formatSlotTime } from "@/lib/agenda/availability";
import { cn } from "@/lib/utils";
import { ENTRY_STATUS_BADGE, STATUS_ACCENT } from "@/components/appointments/status";
import { StatusBadge } from "@/components/appointments/status-badge";
import { EmptyState } from "@/components/page-header";
import { rowClass, rowGroupClass } from "@/lib/ui/classes";
import type { EntryStatus } from "@/server/db/schema";
import type { TimelineEntry } from "./agenda-day-timeline";
import { EntrySheet } from "./entry-sheet";
import { NewEntrySheet, type SheetBarber, type SheetService } from "./new-entry-sheet";

/**
 * Tela "Hoje" do barbeiro: todos os horários do expediente em ordem — os
 * ocupados com ação ao tocar, os livres com "+" para encaixe/bloqueio.
 */
export function DayList({
  dateKey,
  entries,
  barber,
  stepMinutes,
  services,
}: {
  dateKey: string;
  entries: TimelineEntry[];
  barber: SheetBarber;
  stepMinutes: number;
  services: SheetService[];
}) {
  const [selected, setSelected] = useState<TimelineEntry | null>(null);
  const [openedAt, setOpenedAt] = useState(0);
  const [addAt, setAddAt] = useState<string | null>(null);
  const rows = useMemo(
    () =>
      buildDayRows({
        openTime: barber.openTime,
        closeTime: barber.closeTime,
        isClosed: barber.isClosed,
        stepMinutes,
        entries: entries.filter((e) => e.status !== "cancelled"),
      }),
    [barber, stepMinutes, entries],
  );

  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        icon={CalendarOff}
        title="Sem expediente hoje"
        description="Os horários deste dia estão fechados na sua escala ou no funcionamento da barbearia."
      />
    );
  }

  return (
    <>
      <ol className={rowGroupClass} aria-label="Horários de hoje">
        {rows.map((row) =>
          row.kind === "free" ? (
            <li key={`free-${row.startMin}`}>
              <button
                type="button"
                onClick={() => setAddAt(row.time)}
                aria-label={`${row.time}, livre: encaixe ou bloqueio`}
                className={cn(rowClass, "gap-4 text-ink-subtle")}
              >
                <span className="tabular w-12 shrink-0 text-sm font-bold">{row.time}</span>
                <span className="flex-1 text-sm">Livre</span>
                <Plus className="size-5 text-cta-ink" aria-hidden />
              </button>
            </li>
          ) : (
            <li key={row.entry.id}>
              <button
                type="button"
                onClick={() => {
                  setOpenedAt(Date.now());
                  setSelected(row.entry);
                }}
                className={cn(rowClass, "min-h-16 gap-4")}
              >
                <span className="tabular w-12 shrink-0 text-sm font-extrabold">{formatSlotTime(row.entry.starts_at)}</span>
                <span
                  className={cn(
                    "h-10 w-1 shrink-0 rounded-full",
                    row.entry.type === "block"
                      ? "bg-hairline-strong"
                      : STATUS_ACCENT[ENTRY_STATUS_BADGE[row.entry.status as EntryStatus].variant].bar,
                  )}
                  aria-hidden
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-bold">
                    {row.entry.type === "block" ? `Bloqueio${row.entry.note ? ` · ${row.entry.note}` : ""}` : row.entry.clientName}
                  </span>
                  <span className="truncate text-sm text-ink-subtle">
                    {row.entry.type === "block" ? `até ${formatSlotTime(row.entry.ends_at)}` : (row.entry.serviceName ?? "Serviço")}
                  </span>
                </span>
                {row.entry.type === "appointment" && <StatusBadge status={row.entry.status as EntryStatus} size="sm" />}
                <ChevronRight className="size-4 shrink-0 text-ink-tertiary" aria-hidden />
              </button>
            </li>
          ),
        )}
      </ol>
      <EntrySheet entry={selected} onClose={() => setSelected(null)} openedAt={openedAt} />
      <NewEntrySheet
        open={addAt !== null}
        onOpenChange={(o) => !o && setAddAt(null)}
        dateKey={dateKey}
        barbers={[barber]}
        defaultBarberId={barber.id}
        defaultTime={addAt ?? undefined}
        services={services}
      />
    </>
  );
}
