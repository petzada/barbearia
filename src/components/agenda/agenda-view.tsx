"use client";

import { useState } from "react";
import Link from "next/link";
import { chipClass } from "@/lib/ui/classes";
import { cn, countLabel } from "@/lib/utils";
import { AgendaDayTimeline, type TimelineEntry } from "./agenda-day-timeline";
import { DayNav } from "./day-nav";
import { EntrySheet } from "./entry-sheet";
import { MultiAgenda, type AgendaColumn } from "./multi-agenda";
import { NewEntrySheet, type SheetService } from "./new-entry-sheet";

/**
 * Agenda do dia. Barbeiro: uma coluna (a própria). Gestão: colunas por
 * barbeiro lado a lado, ou um só barbeiro pelos chips. Tocar num item abre a
 * folha de ações; o "+" (ou um horário vazio) abre encaixe/bloqueio.
 */
export function AgendaView({
  basePath,
  dateKey,
  columns,
  services,
  selectedBarberId,
  showBarberFilter = false,
}: {
  basePath: string;
  dateKey: string;
  columns: AgendaColumn[];
  services: SheetService[];
  selectedBarberId?: string;
  showBarberFilter?: boolean;
}) {
  const [selected, setSelected] = useState<TimelineEntry | null>(null);
  const [openedAt, setOpenedAt] = useState(0);
  const [adding, setAdding] = useState<{ barberId: string; time?: string } | null>(null);

  const visible = selectedBarberId ? columns.filter((c) => c.barber.id === selectedBarberId) : columns;
  const single = visible.length === 1 ? visible[0] : null;
  const appointments = visible.flatMap((c) => c.entries).filter((e) => e.type === "appointment" && e.status !== "cancelled");
  const closedReason = single && "closedReason" in single.dayBounds ? (single.dayBounds as { closedReason?: string | null }).closedReason : null;

  const hrefFor = (day: string, barberId = selectedBarberId) => {
    const params = new URLSearchParams({ dia: day });
    if (barberId) params.set("barbeiro", barberId);
    return `${basePath}?${params.toString()}`;
  };

  const select = (entry: TimelineEntry) => {
    setOpenedAt(Date.now());
    setSelected(entry);
  };

  return (
    <div className="flex flex-col gap-5">
      <DayNav dateKey={dateKey} hrefFor={hrefFor} onAdd={() => setAdding({ barberId: (single ?? columns[0])?.barber.id ?? "" })} />

      {showBarberFilter && columns.length > 1 && (
        <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:px-0">
          <Link
            href={`${basePath}?dia=${dateKey}`}
            aria-current={!selectedBarberId ? "true" : undefined}
            className={cn("shrink-0 px-4", chipClass)}
          >
            Todos
          </Link>
          {columns.map((c) => (
            <Link
              key={c.barber.id}
              href={hrefFor(dateKey, c.barber.id)}
              aria-current={selectedBarberId === c.barber.id ? "true" : undefined}
              className={cn("shrink-0 px-4", chipClass)}
            >
              {c.barber.name}
            </Link>
          ))}
        </div>
      )}

      <p className="text-sm text-ink-subtle">
        {closedReason
          ? `Fechado: ${closedReason}.`
          : appointments.length === 0
            ? "Nenhum atendimento neste dia."
            : `${countLabel(appointments.length, "atendimento", "atendimentos")} · toque para ver ações`}
      </p>

      {single ? (
        <div className="rounded-lg bg-card p-3 shadow-card">
          <AgendaDayTimeline dateKey={dateKey} entries={single.entries} dayBounds={single.dayBounds} onSelect={select} />
        </div>
      ) : (
        <MultiAgenda dateKey={dateKey} columns={visible} onSelect={select} onAddAt={(barberId, time) => setAdding({ barberId, time })} />
      )}

      <EntrySheet entry={selected} onClose={() => setSelected(null)} showBarber={columns.length > 1} openedAt={openedAt} />
      <NewEntrySheet
        open={adding !== null}
        onOpenChange={(o) => !o && setAdding(null)}
        dateKey={dateKey}
        defaultBarberId={adding?.barberId ?? ""}
        defaultTime={adding?.time}
        services={services}
        barbers={columns.map((c) => ({ id: c.barber.id, name: c.barber.name, ...c.dayBounds }))}
      />
    </div>
  );
}
