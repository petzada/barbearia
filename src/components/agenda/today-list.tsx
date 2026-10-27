"use client";

import { useEffect, useState } from "react";
import { useSheetState } from "@/components/kit/use-sheet-state";
import { CalendarCheck2, CalendarOff, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { rowClass, rowGroupClass } from "@/lib/ui/classes";
import { formatSlotTime } from "@/lib/agenda/availability";
import { PaymentBadge } from "@/components/appointments/status-badge";
import { EmptyState } from "@/components/page-header";
import type { EntryPaymentMethod, EntryPaymentStatus } from "@/server/db/schema";
import type { TimelineEntry } from "./agenda-day-timeline";
import { EntrySheet } from "./entry-sheet";

const TICK_MS = 30_000;

/**
 * "Hoje" do barbeiro: só os atendimentos pendentes, uma linha por atendimento
 * (todas do mesmo tamanho). Os que já passaram ficam "Aguardando conclusão" e o
 * em andamento ganha a tag "Agora". A visão por horas fica na Agenda.
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

  const items = entries
    .map((entry) => ({ entry, start: Date.parse(entry.starts_at), end: Date.parse(entry.ends_at) }))
    .sort((a, b) => a.start - b.start || a.end - b.end);

  return (
    <>
      <ol className={rowGroupClass} aria-label="Atendimentos pendentes de hoje">
        {items.map(({ entry, start, end }) => {
          const late = end <= now;
          const started = !late && start <= now;
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => {
                  setOpenedAt(Date.now());
                  sheet.show(entry);
                }}
                className={cn(rowClass, "items-start gap-4", started && "bg-teal-soft")}
              >
                <span className="tabular flex w-12 shrink-0 flex-col leading-tight">
                  <span className="text-base font-extrabold">{formatSlotTime(entry.starts_at)}</span>
                  <span className="text-xs font-semibold text-ink-subtle">{formatSlotTime(entry.ends_at)}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-bold">{entry.clientName}</span>
                  <span className="truncate text-sm text-ink-subtle">{entry.serviceName ?? "Serviço"}</span>
                  <span>
                    <PaymentBadge
                      method={entry.paymentMethod as EntryPaymentMethod | null}
                      status={entry.paymentStatus as EntryPaymentStatus | null}
                      size="sm"
                    />
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-2 self-stretch">
                  {late ? (
                    <span className="rounded-full bg-warning/12 px-2 py-0.5 text-[11px] font-extrabold text-warning-ink">Aguardando conclusão</span>
                  ) : started ? (
                    <span className="rounded-full bg-cta px-2 py-0.5 text-[11px] font-extrabold text-cta-foreground">Agora</span>
                  ) : (
                    <span aria-hidden />
                  )}
                  <ChevronRight className="my-auto size-4 text-ink-tertiary" aria-hidden />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <EntrySheet entry={sheet.item} open={sheet.open} onClose={sheet.hide} openedAt={openedAt} />
    </>
  );
}
