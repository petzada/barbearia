"use client";

import Link from "next/link";
import { CalendarX2, MessageCircle, Users } from "lucide-react";
import { formatSlotTime } from "@/lib/agenda/availability";
import { formatDayLong } from "@/lib/agenda/format";
import { chipClass } from "@/lib/ui/classes";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { MonthCalendar } from "@/components/kit/month-calendar";

/** Agrupa horários em manhã / tarde / noite (SP). */
export function groupSlots(slots: number[]) {
  const groups: { label: string; slots: number[] }[] = [
    { label: "Manhã", slots: [] },
    { label: "Tarde", slots: [] },
    { label: "Noite", slots: [] },
  ];
  for (const s of slots) {
    const hour = Number(formatSlotTime(s).slice(0, 2));
    groups[hour < 12 ? 0 : hour < 18 ? 1 : 2].slots.push(s);
  }
  return groups.filter((g) => g.slots.length > 0);
}

/** Etapa 3: calendário mensal sempre aberto + horários agrupados. */
export function ScheduleStep({
  windowKeys,
  availableDays,
  day,
  slots,
  loadingSlots,
  selectedSlot,
  onSelectDay,
  onSelectSlot,
  onChangeBarber,
  contactHref,
}: {
  windowKeys: string[];
  /** Volta à etapa de barbeiro (omitido quando só há um). */
  onChangeBarber?: () => void;
  contactHref: string | null;
  availableDays: ReadonlySet<string> | null;
  day: string | null;
  slots: number[];
  loadingSlots: boolean;
  selectedSlot: number | null;
  onSelectDay: (dateKey: string) => void;
  onSelectSlot: (slot: number) => void;
}) {
  const groups = groupSlots(slots);
  const noDays = availableDays !== null && availableDays.size === 0;

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-xl font-bold tracking-tight">Quando você quer vir?</h2>
      {noDays ? (
        <EmptyState
          icon={CalendarX2}
          title="Agenda cheia por enquanto"
          description="Não há horários livres nos próximos dias com este barbeiro."
          action={
            onChangeBarber ? (
              <Button onClick={onChangeBarber}>
                <Users aria-hidden />
                Escolher outro barbeiro
              </Button>
            ) : contactHref ? (
              <a href={contactHref} target="_blank" rel="noreferrer" className={buttonVariants()}>
                <MessageCircle aria-hidden />
                Falar com a barbearia
              </a>
            ) : (
              <Link href="/inicio" className={buttonVariants({ variant: "outline" })}>
                Voltar ao início
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <MonthCalendar
              key={windowKeys[0]}
              range={{ from: windowKeys[0], to: windowKeys[windowKeys.length - 1] }}
              availableKeys={availableDays}
              selected={day}
              onSelect={onSelectDay}
            />
          </div>
          {day && (
            <div className="flex flex-col gap-4">
              <p className="text-sm font-bold text-ink-subtle">{formatDayLong(day)}</p>
              {loadingSlots ? (
                <div className="grid grid-cols-4 gap-2" aria-label="Carregando horários">
                  {Array.from({ length: 8 }, (_, i) => (
                    <Skeleton key={i} className="h-12 rounded-md" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <EmptyState
                  compact
                  icon={CalendarX2}
                  title="Dia lotado"
                  description="Os horários deste dia acabaram de ser preenchidos. Escolha outro dia no calendário."
                />
              ) : (
                groups.map((group) => (
                  <div key={group.label} className="flex flex-col gap-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-subtle">{group.label}</p>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {group.slots.map((s) => (
                        <button
                          key={s}
                          type="button"
                          aria-pressed={selectedSlot === s}
                          onClick={() => onSelectSlot(s)}
                          className={cn("tabular h-12", chipClass)}
                        >
                          {formatSlotTime(s)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
