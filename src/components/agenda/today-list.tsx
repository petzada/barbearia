"use client";

import { Fragment, useEffect, useState } from "react";
import { useSheetState } from "@/components/kit/use-sheet-state";
import { CalendarCheck2, CalendarOff, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { rowClass, rowGroupClass } from "@/lib/ui/classes";
import { formatTimeRange } from "@/lib/agenda/format";
import { formatClock, minutesOfDaySP } from "@/lib/agenda/today";
import { PaymentBadge } from "@/components/appointments/status-badge";
import { EmptyState } from "@/components/page-header";
import type { EntryPaymentMethod, EntryPaymentStatus } from "@/server/db/schema";
import type { TimelineEntry } from "./agenda-day-timeline";
import { EntrySheet } from "./entry-sheet";

const TICK_MS = 30_000;

/**
 * "Hoje" do barbeiro: só os atendimentos pendentes, uma linha por atendimento
 * (todas do mesmo tamanho). Os que já passaram ficam "Aguardando conclusão",
 * o em andamento fica "Agora" e um marcador fino separa o passado dos
 * próximos. A visão por horas fica na Agenda.
 */
export function TodayList({
  entries,
  isClosed,
  initialNow,
}: {
  /** Apenas pendentes (ver `isPendingAppointment`). */
  entries: TimelineEntry[];
  isClosed: boolean;
  /** Instante do servidor (evita divergência na hidratação). */
  initialNow: number;
}) {
  const [now, setNow] = useState(initialNow);
  const sheet = useSheetState<TimelineEntry>();
  const [openedAt, setOpenedAt] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  if (entries.length === 0) {
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

  const nowMin = minutesOfDaySP(now);
  const items = entries
    .map((entry) => ({ entry, start: Date.parse(entry.starts_at), end: Date.parse(entry.ends_at) }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  // O marcador do agora vai antes do primeiro que ainda não começou.
  const nowIndex = items.findIndex((i) => i.start > now);
  const markerAt = nowIndex === -1 ? items.length : nowIndex;

  const nowMarker = (
    <li>
      <div className="flex items-center gap-2 px-4 py-1" role="status" aria-label={`Agora, ${formatClock(nowMin)}`}>
        <span className="tabular rounded-full bg-cta px-2 py-0.5 text-[11px] font-extrabold text-cta-foreground">
          {formatClock(nowMin)}
        </span>
        <span className="h-0.5 flex-1 bg-cta" />
      </div>
    </li>
  );

  return (
    <>
      <ol className={rowGroupClass} aria-label="Atendimentos pendentes de hoje">
        {items.map(({ entry, start, end }, i) => {
          const late = end <= now;
          const started = !late && start <= now;
          return (
            <Fragment key={entry.id}>
              {i === markerAt && nowMarker}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setOpenedAt(Date.now());
                    sheet.show(entry);
                  }}
                  className={cn(rowClass, "min-h-16 gap-4", started && "bg-teal-soft")}
                >
                  <span
                    className={cn("h-10 w-1 shrink-0 rounded-full", late ? "bg-warning" : "bg-cta")}
                    aria-hidden
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <span className="tabular shrink-0 whitespace-nowrap text-sm font-extrabold">
                        {formatTimeRange(entry.starts_at, entry.ends_at)}
                      </span>
                      {late ? (
                        <span className="truncate text-xs font-bold text-warning-ink">Aguardando conclusão</span>
                      ) : started ? (
                        <span className="text-xs font-bold text-cta-ink">Agora</span>
                      ) : null}
                    </span>
                    <span className="truncate font-bold">{entry.clientName}</span>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm text-ink-subtle">{entry.serviceName ?? "Serviço"}</span>
                      <PaymentBadge
                        method={entry.paymentMethod as EntryPaymentMethod | null}
                        status={entry.paymentStatus as EntryPaymentStatus | null}
                        size="sm"
                      />
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-ink-tertiary" aria-hidden />
                </button>
              </li>
            </Fragment>
          );
        })}
        {markerAt === items.length && nowMarker}
      </ol>
      <EntrySheet entry={sheet.item} open={sheet.open} onClose={sheet.hide} openedAt={openedAt} />
    </>
  );
}
