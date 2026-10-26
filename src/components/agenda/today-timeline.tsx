"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSheetState } from "@/components/kit/use-sheet-state";
import { CalendarCheck2, CalendarOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTimeRange } from "@/lib/agenda/format";
import { formatClock, minutesOfDaySP, timelineHourRange } from "@/lib/agenda/today";
import { PaymentBadge } from "@/components/appointments/status-badge";
import { EmptyState } from "@/components/page-header";
import type { EntryPaymentMethod, EntryPaymentStatus } from "@/server/db/schema";
import type { TimelineEntry } from "./agenda-day-timeline";
import { EntrySheet } from "./entry-sheet";

const HOUR_PX = 96;
const MIN_CARD_PX = 60;
const TICK_MS = 30_000;

/**
 * "Hoje" do barbeiro: só os atendimentos pendentes, numa linha do tempo que
 * acompanha o dia (horário de Brasília, 24h). A linha do "agora" anda a cada
 * 30 s, as horas que já passaram ficam apagadas e a tela rola até o agora.
 */
export function TodayTimeline({
  entries,
  openTime,
  closeTime,
  isClosed,
  initialNow,
}: {
  /** Apenas pendentes (ver `isPendingAppointment`). */
  entries: TimelineEntry[];
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  /** Instante do servidor (evita divergência na hidratação). */
  initialNow: number;
}) {
  const [now, setNow] = useState(initialNow);
  const sheet = useSheetState<TimelineEntry>();
  const [openedAt, setOpenedAt] = useState(0);
  const nowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const items = useMemo(
    () =>
      entries
        .map((e) => ({ entry: e, startMin: minutesOfDaySP(e.starts_at), endMin: minutesOfDaySP(e.ends_at) || 1440 }))
        .sort((a, b) => a.startMin - b.startMin),
    [entries],
  );
  const nowMin = minutesOfDaySP(now);
  const { startHour, endHour } = timelineHourRange({ openTime, closeTime, items, nowMin });
  const top = (min: number) => ((min - startHour * 60) / 60) * HOUR_PX;
  const showNow = nowMin >= startHour * 60 && nowMin <= endHour * 60;

  // Rola até o "agora" ao abrir a tela.
  useEffect(() => {
    nowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon={isClosed ? CalendarOff : CalendarCheck2}
        title="Sem atendimentos pendentes hoje"
        description={
          isClosed ? "Hoje não há expediente na sua escala." : "Quando um cliente agendar para hoje, ele aparece aqui na hora certa."
        }
      />
    );
  }

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  return (
    <>
      <div
        className="relative rounded-lg bg-card py-3 pl-14 pr-3 shadow-card"
        style={{ height: (endHour - startHour) * HOUR_PX + 24 }}
        aria-label="Linha do tempo de hoje"
      >
        {hours.map((h) => {
          const past = (h + 1) * 60 <= nowMin;
          return (
            <div
              key={h}
              className={cn("absolute inset-x-0 border-t border-hairline", past && "bg-muted/60")}
              style={{ top: 12 + top(h * 60), height: HOUR_PX }}
              aria-hidden
            >
              <span className={cn("tabular absolute left-3 -top-2.5 bg-card px-1 text-xs font-bold", past ? "text-ink-tertiary" : "text-ink-subtle")}>
                {h}h
              </span>
            </div>
          );
        })}

        <ol className="relative h-full">
          {items.map(({ entry, startMin, endMin }) => {
            const height = Math.max(MIN_CARD_PX, ((endMin - startMin) / 60) * HOUR_PX - 4);
            const started = startMin <= nowMin;
            const late = endMin <= nowMin;
            return (
              <li key={entry.id} className="absolute inset-x-0" style={{ top: top(startMin) + 2, height }}>
                <button
                  type="button"
                  onClick={() => {
                    setOpenedAt(Date.now());
                    sheet.show(entry);
                  }}
                  className={cn(
                    "flex size-full flex-col justify-center gap-0.5 overflow-hidden rounded-md border-l-4 bg-teal-soft px-3 text-left transition active:scale-[0.99]",
                    late ? "border-warning" : started ? "border-cta ring-2 ring-cta/30" : "border-cta",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="tabular text-sm font-extrabold">{formatTimeRange(entry.starts_at, entry.ends_at)}</span>
                    {late ? (
                      <span className="text-xs font-bold text-warning-ink">Aguardando conclusão</span>
                    ) : started ? (
                      <span className="text-xs font-bold text-cta-ink">Agora</span>
                    ) : null}
                  </span>
                  <span className="truncate font-bold">{entry.clientName}</span>
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm text-ink-subtle">{entry.serviceName ?? "Serviço"}</span>
                    <PaymentBadge
                      method={entry.paymentMethod as EntryPaymentMethod | null}
                      status={entry.paymentStatus as EntryPaymentStatus | null}
                      size="sm"
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {showNow && (
          <div
            ref={nowRef}
            className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
            style={{ top: 12 + top(nowMin) }}
            role="status"
            aria-label={`Agora, ${formatClock(nowMin)}`}
          >
            <span className="tabular ml-1 rounded-full bg-cta px-2 py-0.5 text-[11px] font-extrabold text-cta-foreground">
              {formatClock(nowMin)}
            </span>
            <span className="h-0.5 flex-1 bg-cta" />
          </div>
        )}
      </div>
      <EntrySheet entry={sheet.item} open={sheet.open} onClose={sheet.hide} openedAt={openedAt} />
    </>
  );
}
