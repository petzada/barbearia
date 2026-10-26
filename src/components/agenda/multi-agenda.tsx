"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildTimelineLabels,
  buildTimelineRows,
  expandBoundsForEntries,
  minutesFromIsoInSP,
  minuteToTopPx,
  nowLineTopPx,
  parseTimeToMinutes,
  spanToHeightPx,
  timelineRowsHeightPx,
} from "@/lib/agenda/timeline";
import { todayDateKeySP } from "@/lib/agenda/timezone";
import { formatSlotTime } from "@/lib/agenda/availability";
import { formatHoursRange } from "@/lib/agenda/format";
import { ENTRY_STATUS_BADGE, STATUS_ACCENT } from "@/components/appointments/status";
import type { EntryStatus } from "@/server/db/schema";
import { cn } from "@/lib/utils";
import type { TimelineEntry } from "./agenda-day-timeline";

export type AgendaColumn = {
  barber: { id: string; name: string };
  dayBounds: { openTime: string; closeTime: string; isClosed: boolean };
  entries: TimelineEntry[];
};

const TIME_COL = 48;
const MIN_ENTRY_PX = 36;

/**
 * Agenda geral: uma coluna por barbeiro lado a lado sobre a mesma grade de
 * horários (rola na horizontal no celular). Fora do expediente fica hachurado.
 */
export function MultiAgenda({
  dateKey,
  columns,
  onSelect,
  onAddAt,
}: {
  dateKey: string;
  columns: AgendaColumn[];
  onSelect: (entry: TimelineEntry) => void;
  onAddAt: (barberId: string, time: string) => void;
}) {
  const isToday = dateKey === todayDateKeySP();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [isToday]);

  const bounds = useMemo(() => {
    const open = columns.filter((c) => !c.dayBounds.isClosed);
    const openTime = open.length ? open.map((c) => c.dayBounds.openTime).sort()[0] : "09:00";
    const closeTime = open.length ? open.map((c) => c.dayBounds.closeTime).sort().at(-1)! : "19:00";
    return expandBoundsForEntries(openTime, closeTime, columns.flatMap((c) => c.entries));
  }, [columns]);

  const rows = useMemo(() => buildTimelineRows(bounds.openTime, bounds.closeTime), [bounds]);
  const labels = useMemo(() => buildTimelineLabels(rows), [rows]);
  const height = timelineRowsHeightPx(rows);
  const nowTop = isToday ? nowLineTopPx(rows, now) : null;

  return (
    <div className="scrollbar-none overflow-x-auto overscroll-x-contain rounded-lg bg-card shadow-card" data-testid="multi-agenda">
      <div className="relative min-w-max">
        <div className="sticky top-0 z-30 flex border-b border-hairline bg-card/95 backdrop-blur" style={{ paddingLeft: TIME_COL }}>
          {columns.map((c) => (
            <div key={c.barber.id} className="w-40 shrink-0 px-2 py-3 text-center text-sm font-bold sm:w-48">
              <span className="block truncate">{c.barber.name}</span>
              <span className="block text-[11px] font-semibold text-ink-subtle">
                {c.dayBounds.isClosed ? "Folga ou fechado" : formatHoursRange(c.dayBounds.openTime, c.dayBounds.closeTime)}
              </span>
            </div>
          ))}
        </div>

        <div className="relative flex" style={{ height: height + 12, paddingTop: 12 }}>
          <div className="sticky left-0 z-20 shrink-0 bg-card" style={{ width: TIME_COL, height }}>
            {labels.map((l) => (
              <span
                key={`${l.anchor}-${l.topPx}`}
                className="tabular absolute right-2 -translate-y-1.5 text-xs text-ink-subtle"
                style={{ top: l.topPx }}
              >
                {l.text}
              </span>
            ))}
          </div>

          {columns.map((c) => {
            const open = parseTimeToMinutes(c.dayBounds.openTime);
            const close = parseTimeToMinutes(c.dayBounds.closeTime);
            return (
              <div key={c.barber.id} className="relative w-40 shrink-0 border-l border-hairline sm:w-48" style={{ height }}>
                {rows.map((r) => {
                  const off = c.dayBounds.isClosed || r.startMin < open || r.endMin > close;
                  return (
                    <button
                      key={r.startMin}
                      type="button"
                      aria-label={`Encaixe ou bloqueio às ${r.label} com ${c.barber.name}`}
                      onClick={() => onAddAt(c.barber.id, `${String(Math.floor(r.startMin / 60)).padStart(2, "0")}:${String(r.startMin % 60).padStart(2, "0")}`)}
                      className={cn(
                        "absolute inset-x-0 border-t border-hairline transition hover:bg-teal-soft/50",
                        off && "bg-[repeating-linear-gradient(135deg,var(--surface-3)_0_6px,transparent_6px_12px)]",
                      )}
                      style={{ top: minuteToTopPx(rows, r.startMin), height: r.heightPx }}
                    />
                  );
                })}
                {c.entries.map((e) => {
                  const start = minutesFromIsoInSP(e.starts_at);
                  const top = minuteToTopPx(rows, start) + 1;
                  const h = Math.max(MIN_ENTRY_PX, spanToHeightPx(rows, start, minutesFromIsoInSP(e.ends_at)) - 2);
                  const done = e.status === "completed" || e.status === "no_show";
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => onSelect(e)}
                      className={cn(
                        "absolute inset-x-1 z-10 flex flex-col overflow-hidden rounded-md px-2 py-1 text-left",
                        e.type === "block"
                          ? "border border-dashed border-hairline-strong bg-surface-2"
                          : done
                            ? "bg-card opacity-70 shadow-card"
                            : "border-l-4 border-cta bg-card shadow-card",
                      )}
                      style={{ top, height: h }}
                    >
                      <span className="truncate text-xs font-bold">
                        {e.type === "block" ? "Bloqueio" : e.clientName}
                      </span>
                      <span className="tabular truncate text-[11px] text-ink-subtle">
                        {formatSlotTime(e.starts_at)} · {e.type === "block" ? e.note ?? "" : e.serviceName}
                      </span>
                      {done && e.type === "appointment" && (
                        <span className={cn("text-[11px] font-bold", STATUS_ACCENT[ENTRY_STATUS_BADGE[e.status as EntryStatus].variant].text)}>
                          {ENTRY_STATUS_BADGE[e.status as EntryStatus].label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {nowTop != null && (
            <div className="pointer-events-none absolute right-0 z-20 flex items-center" style={{ top: nowTop + 12, left: TIME_COL }} aria-hidden>
              <span className="size-2.5 shrink-0 rounded-full border-2 border-cta bg-card" />
              <span className="h-px flex-1 bg-cta" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
