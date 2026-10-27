"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSheetState } from "@/components/kit/use-sheet-state";
import { CalendarCheck2, CalendarOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTimeRange } from "@/lib/agenda/format";
import { formatClock, minutesOfDaySP, timelineHourRange } from "@/lib/agenda/today";
import { assignColumnsByBox } from "@/lib/agenda/timeline";
import { PaymentBadge } from "@/components/appointments/status-badge";
import { EmptyState } from "@/components/page-header";
import type { EntryPaymentMethod, EntryPaymentStatus } from "@/server/db/schema";
import type { TimelineEntry } from "./agenda-day-timeline";
import { EntrySheet } from "./entry-sheet";

/** 15 min = 30 px (uma linha), 30 min = 60 px (duas linhas), 45 min+ = três linhas. */
export const HOUR_PX = 120;
/** Respiro vertical entre cards encostados. */
const CARD_GAP_PX = 4;
/** Um atendimento mais curto que isso ainda ganha uma linha legível. */
const MIN_CARD_PX = 26;
/** Altura a partir da qual cabem 2 e 3 linhas (horário/cliente, serviço, ...). */
const TWO_LINES_PX = 44;
const THREE_LINES_PX = 68;
/** Margem que fica acima da linha do "agora" quando a tela abre. */
const NOW_MARGIN_PX = 40;
const PAD_TOP_PX = 12;
const TICK_MS = 30_000;
const COLUMN_GAP_PX = 4;

/**
 * "Hoje" do barbeiro: só os atendimentos pendentes, numa linha do tempo que
 * acompanha o dia (horário de Brasília, 24h). A linha do "agora" anda a cada
 * 30 s, as horas que já passaram ficam apagadas. A linha do tempo rola dentro
 * de si mesma (cabe numa dobra do celular) e abre já posicionada no agora.
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const items = useMemo(
    () =>
      entries
        .map((e) => ({ entry: e, startMin: minutesOfDaySP(e.starts_at), endMin: minutesOfDaySP(e.ends_at) || 1440 }))
        .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin),
    [entries],
  );
  const nowMin = minutesOfDaySP(now);
  const { startHour, endHour } = timelineHourRange({ openTime, closeTime, items, nowMin });
  const top = (min: number) => ((min - startHour * 60) / 60) * HOUR_PX;
  const showNow = nowMin >= startHour * 60 && nowMin <= endHour * 60;
  const nowTop = PAD_TOP_PX + top(nowMin);

  // Cards em px; os que se cruzam na tela (encaixes no mesmo horário) vão
  // lado a lado, nunca um por cima do outro.
  const cards = useMemo(
    () =>
      assignColumnsByBox(
        items.map((it) => ({
          ...it,
          id: it.entry.id,
          topPx: ((it.startMin - startHour * 60) / 60) * HOUR_PX + CARD_GAP_PX / 2,
          heightPx: Math.max(MIN_CARD_PX, ((it.endMin - it.startMin) / 60) * HOUR_PX - CARD_GAP_PX),
        })),
      ),
    [items, startHour],
  );

  // Rola só o contêiner da linha do tempo até o "agora" ao abrir a tela — de
  // uma vez (sem animação) e sem mexer na rolagem da página.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !showNow) return;
    el.scrollTop = Math.max(0, nowTop - NOW_MARGIN_PX);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao montar
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
        ref={scrollRef}
        data-testid="today-timeline-scroll"
        className="max-h-[min(30rem,calc(100dvh-18rem))] min-h-48 overflow-y-auto overscroll-contain rounded-lg bg-card shadow-card"
        aria-label="Linha do tempo de hoje"
      >
        <div className="relative py-3 pl-14 pr-3" style={{ height: (endHour - startHour) * HOUR_PX + PAD_TOP_PX * 2 }}>
          {hours.map((h) => {
            const past = (h + 1) * 60 <= nowMin;
            return (
              <div
                key={h}
                className={cn("absolute inset-x-0 border-t border-hairline", past && "bg-muted/60")}
                style={{ top: PAD_TOP_PX + top(h * 60), height: HOUR_PX }}
                aria-hidden
              >
                <span className={cn("tabular absolute left-3 -top-2.5 bg-card px-1 text-xs font-bold", past ? "text-ink-tertiary" : "text-ink-subtle")}>
                  {h}h
                </span>
                <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-hairline/60" />
              </div>
            );
          })}

          <ol className="relative h-full">
            {cards.map(({ entry, startMin, endMin, topPx, heightPx, column, columnCount }) => {
              const started = startMin <= nowMin;
              const late = endMin <= nowMin;
              const lines = heightPx >= THREE_LINES_PX ? 3 : heightPx >= TWO_LINES_PX ? 2 : 1;
              const colWidth = `calc((100% - ${(columnCount - 1) * COLUMN_GAP_PX}px) / ${columnCount})`;
              return (
                <li
                  key={entry.id}
                  data-testid="today-timeline-card"
                  data-column={column}
                  data-column-count={columnCount}
                  className="absolute"
                  style={{
                    top: topPx,
                    height: heightPx,
                    left: `calc(${column} * (${colWidth} + ${COLUMN_GAP_PX}px))`,
                    width: colWidth,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setOpenedAt(Date.now());
                      sheet.show(entry);
                    }}
                    className={cn(
                      "flex size-full flex-col justify-center overflow-hidden rounded-md border-l-4 bg-teal-soft px-3 text-left transition active:scale-[0.99]",
                      lines === 3 && "gap-0.5",
                      late ? "border-warning" : started ? "border-cta ring-2 ring-cta/30" : "border-cta",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="tabular shrink-0 whitespace-nowrap text-sm font-extrabold">
                        {lines === 1 ? formatClock(startMin) : formatTimeRange(entry.starts_at, entry.ends_at)}
                      </span>
                      {lines < 3 && <span className="truncate font-bold">{entry.clientName}</span>}
                      {late ? (
                        <span className="shrink-0 truncate text-xs font-bold text-warning-ink">
                          {lines === 1 ? "Atrasado" : "Aguardando conclusão"}
                        </span>
                      ) : started ? (
                        <span className="shrink-0 text-xs font-bold text-cta-ink">Agora</span>
                      ) : null}
                    </span>
                    {lines === 3 && <span className="truncate font-bold">{entry.clientName}</span>}
                    {lines >= 2 && (
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm text-ink-subtle">{entry.serviceName ?? "Serviço"}</span>
                        <PaymentBadge
                          method={entry.paymentMethod as EntryPaymentMethod | null}
                          status={entry.paymentStatus as EntryPaymentStatus | null}
                          size="sm"
                        />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>

          {showNow && (
            <div
              className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
              style={{ top: nowTop }}
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
      </div>
      <EntrySheet entry={sheet.item} open={sheet.open} onClose={sheet.hide} openedAt={openedAt} />
    </>
  );
}
