"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildTimelineLabels,
  buildTimelineRows,
  COLUMN_GAP_PX,
  entryDurationMinutes,
  expandBoundsForEntries,
  layoutTimelineEntriesWithColumns,
  minutesFromIsoInSP,
  nowLineTopPx,
  spanToHeightPx,
  timelineRowsHeightPx,
} from "@/lib/agenda/timeline";
import { todayDateKeySP } from "@/lib/agenda/timezone";
import { formatSlotTime } from "@/lib/agenda/availability";
import { cn } from "@/lib/utils";
import { CalendarOff } from "lucide-react";
import { EmptyState } from "@/components/page-header";
import { ENTRY_STATUS_BADGE, STATUS_ACCENT } from "@/components/appointments/status";
import type { EntryStatus } from "@/server/db/schema";

export type TimelineEntry = {
  id: string;
  type: "appointment" | "block";
  starts_at: string;
  ends_at: string;
  status: string;
  note: string | null;
  clientName: string;
  clientPhone: string | null;
  serviceName: string | null;
  barberName: string;
  priceCents: number | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
};

type DayBounds = {
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

type AgendaDayTimelineProps = {
  dateKey: string;
  entries: TimelineEntry[];
  dayBounds: DayBounds;
  onSelect: (entry: TimelineEntry) => void;
};

const TIME_COL_WIDTH = "3.5rem";

function eventColumnStyle(column: number, columnCount: number) {
  const colWidth = `calc((100% - ${TIME_COL_WIDTH} - ${(columnCount - 1) * COLUMN_GAP_PX}px) / ${columnCount})`;
  return {
    left: `calc(${TIME_COL_WIDTH} + ${column} * (${colWidth} + ${COLUMN_GAP_PX}px))`,
    width: colWidth,
  };
}

export function AgendaDayTimeline({
  dateKey,
  entries,
  dayBounds,
  onSelect,
}: AgendaDayTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());
  const isToday = dateKey === todayDateKeySP();

  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [isToday]);

  const displayBounds = useMemo(() => {
    if (dayBounds.isClosed) {
      // Dia de folga/fechado ainda mostra encaixes feitos pela equipe.
      if (entries.length === 0) return dayBounds;
      const first = entries.map((e) => e.starts_at).sort()[0];
      const time = formatSlotTime(first);
      return { ...dayBounds, isClosed: false, ...expandBoundsForEntries(time, time, entries) };
    }
    return {
      ...dayBounds,
      ...expandBoundsForEntries(
        dayBounds.openTime,
        dayBounds.closeTime,
        entries,
      ),
    };
  }, [dayBounds, entries]);

  const timelineRows = useMemo(
    () =>
      displayBounds.isClosed
        ? []
        : buildTimelineRows(
            displayBounds.openTime,
            displayBounds.closeTime,
            entries,
          ),
    [displayBounds, entries],
  );

  const layoutById = useMemo(() => {
    const layouts = layoutTimelineEntriesWithColumns(entries, timelineRows);
    return new Map(layouts.map((l) => [l.id, l]));
  }, [entries, timelineRows]);

  const sortedEntries = useMemo(
    () =>
      [...entries].sort((a, b) => {
        const colA = layoutById.get(a.id)?.column ?? 0;
        const colB = layoutById.get(b.id)?.column ?? 0;
        return colA - colB;
      }),
    [entries, layoutById],
  );

  const timelineLabels = useMemo(
    () => buildTimelineLabels(timelineRows, entries),
    [timelineRows, entries],
  );

  const totalHeight = useMemo(
    () => timelineRowsHeightPx(timelineRows),
    [timelineRows],
  );

  const nowTop = useMemo(() => {
    if (!isToday || timelineRows.length === 0) return null;
    return nowLineTopPx(timelineRows, now);
  }, [isToday, timelineRows, now]);

  // Posiciona a linha do tempo no "agora" só ao abrir o dia (não a cada minuto,
  // senão a rolagem do usuário é puxada de volta enquanto ele arrasta).
  const scrolledForRef = useRef<string | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (nowTop == null || !el || scrolledForRef.current === dateKey) return;
    scrolledForRef.current = dateKey;
    el.scrollTop = Math.max(0, nowTop - el.clientHeight * 0.35);
  }, [dateKey, nowTop]);

  if (displayBounds.isClosed) {
    return (
      <EmptyState
        compact
        icon={CalendarOff}
        title="Sem expediente neste dia"
        description="A barbearia ou o barbeiro não atende nesta data."
      />
    );
  }

  return (
    <div
      ref={scrollRef}
      className="max-h-[calc(100svh-12rem)] overflow-y-auto overscroll-contain"
    >
      <div
        className="relative isolate pt-3"
        style={{ minHeight: totalHeight, paddingLeft: TIME_COL_WIDTH }}
      >
        {/* Coluna de horários (posição absoluta na grade) */}
        <div
          className="pointer-events-none absolute top-0 left-0"
          style={{ width: TIME_COL_WIDTH, height: totalHeight }}
        >
          {timelineLabels.map((label) => (
            <span
              key={`${label.anchor}-${label.topPx}-${label.text}`}
              className={cn(
                "absolute right-2 text-xs tabular-nums text-ink-subtle",
                label.anchor === "end"
                  ? "-translate-y-full"
                  : label.topPx > 0 && "-translate-y-1.5",
              )}
              style={{ top: label.topPx }}
            >
              {label.text}
            </span>
          ))}
        </div>

        {/* Linhas guia horizontais */}
        <div
          className="absolute inset-0 left-0 z-0"
          style={{ marginLeft: TIME_COL_WIDTH }}
        >
          {timelineRows.map((row, i) => (
            <div
              key={`grid-${row.startMin}`}
              className={cn(
                "border-t border-hairline-strong",
                i === timelineRows.length - 1 && "border-b border-hairline-strong",
              )}
              style={{ height: row.heightPx }}
            />
          ))}
        </div>

        {/* Linha de hora atual */}
        {nowTop != null && (
          <div
            className="pointer-events-none absolute right-0 z-20 flex items-center"
            style={{
              top: nowTop,
              left: TIME_COL_WIDTH,
              transform: "translateY(-50%)",
            }}
            aria-hidden
          >
            <span className="size-2.5 shrink-0 rounded-full border-2 border-pastel bg-surface-1" />
            <span className="h-px flex-1 bg-pastel" />
          </div>
        )}

        {/* Cards de eventos */}
        {sortedEntries.map((e) => {
          const layout = layoutById.get(e.id);
          if (!layout) return null;

          const { topPx, heightPx, column, columnCount } = layout;
          const colStyle = eventColumnStyle(column, columnCount);
          const renderTop = topPx + 1;
          const renderHeight = heightPx - 2;
          const durationMin = entryDurationMinutes(e);
          const timeSpanPx =
            durationMin >= 60
              ? spanToHeightPx(
                  timelineRows,
                  minutesFromIsoInSP(e.starts_at),
                  minutesFromIsoInSP(e.ends_at),
                )
              : 0;
          const continuationPx = Math.max(0, timeSpanPx - renderHeight - 2);
          const containsNow =
            isToday &&
            nowTop != null &&
            nowTop >= renderTop &&
            nowTop <= renderTop + renderHeight;
          const done = e.status === "completed" || e.status === "no_show";

          return (
            <div
              key={e.id}
              className="absolute z-10 box-border"
              style={{
                top: renderTop,
                height: renderHeight + continuationPx,
                left: colStyle.left,
                width: colStyle.width,
              }}
            >
              {continuationPx > 0 && (
                <div
                  className="pointer-events-none absolute inset-x-0 rounded-md border border-dashed border-hairline bg-surface-2/30"
                  style={{ top: renderHeight + 1, height: continuationPx - 1 }}
                  aria-hidden
                />
              )}
              <button
                type="button"
                onClick={() => onSelect(e)}
                aria-label={
                  e.type === "appointment"
                    ? `${e.clientName}, ${e.serviceName ?? "serviço"}`
                    : `Bloqueio${e.note ? `: ${e.note}` : ""}`
                }
                className={cn(
                  "relative z-[1] flex w-full shrink-0 flex-col overflow-hidden rounded-md px-3 py-2 text-left transition active:scale-[0.98]",
                  continuationPx > 0 ? "" : "h-full",
                  e.type === "block"
                    ? "border border-dashed border-hairline-strong bg-surface-2"
                    : done
                      ? "bg-card opacity-70 shadow-card"
                      : "border-l-4 border-cta bg-card shadow-card",
                  containsNow && e.type === "appointment" && "ring-2 ring-cta/40",
                )}
                style={{ height: renderHeight }}
              >
                {e.type === "appointment" ? (
                  <>
                    <span className="truncate text-sm font-bold leading-tight">{e.clientName}</span>
                    <span className="truncate text-xs leading-tight text-ink-subtle">
                      {e.serviceName ?? "Serviço"}
                    </span>
                    {done && (
                      <span
                        className={cn(
                          "mt-auto text-[11px] font-bold",
                          STATUS_ACCENT[ENTRY_STATUS_BADGE[e.status as EntryStatus].variant].text,
                        )}
                      >
                        {ENTRY_STATUS_BADGE[e.status as EntryStatus].label}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="truncate text-sm font-bold leading-tight">Bloqueio</span>
                    {e.note && <span className="truncate text-xs leading-tight text-ink-subtle">{e.note}</span>}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
