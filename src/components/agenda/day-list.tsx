"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { buildDayRows } from "@/lib/agenda/day-slots";
import { formatSlotTime } from "@/lib/agenda/availability";
import { cn } from "@/lib/utils";
import { ENTRY_STATUS_BADGE } from "@/components/appointments/status";
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
    return <p className="rounded-lg bg-card p-5 text-center text-sm text-ink-subtle shadow-card">Sem expediente hoje.</p>;
  }

  return (
    <>
      <ol className="divide-y divide-hairline overflow-hidden rounded-lg bg-card shadow-card" aria-label="Horários de hoje">
        {rows.map((row) =>
          row.kind === "free" ? (
            <li key={`free-${row.startMin}`}>
              <button
                type="button"
                onClick={() => setAddAt(row.time)}
                className="flex min-h-12 w-full items-center gap-4 px-4 text-left text-ink-tertiary active:bg-muted"
              >
                <span className="tabular w-12 shrink-0 text-sm font-bold">{row.time}</span>
                <span className="flex-1 text-sm">— livre —</span>
                <Plus className="size-4 text-cta" aria-label={`Encaixe às ${row.time}`} />
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
                className="flex min-h-16 w-full items-center gap-4 px-4 py-3 text-left active:bg-muted"
              >
                <span className="tabular w-12 shrink-0 text-sm font-extrabold">{formatSlotTime(row.entry.starts_at)}</span>
                <span
                  className={cn(
                    "h-10 w-1 shrink-0 rounded-full",
                    row.entry.type === "block" ? "bg-hairline-strong" : row.entry.status === "booked" ? "bg-cta" : "bg-success",
                  )}
                  aria-hidden
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-bold">
                    {row.entry.type === "block" ? `Bloqueio${row.entry.note ? ` · ${row.entry.note}` : ""}` : row.entry.clientName}
                  </span>
                  <span className="truncate text-sm text-ink-subtle">
                    {row.entry.type === "block"
                      ? `até ${formatSlotTime(row.entry.ends_at)}`
                      : `${row.entry.serviceName ?? "Serviço"} · ${ENTRY_STATUS_BADGE[row.entry.status as EntryStatus]?.label ?? ""}`}
                  </span>
                </span>
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
