import { Clock, Crown } from "lucide-react";
import { formatPriceCents } from "@/lib/agenda/availability";
import { getServiceIcon } from "@/lib/services/icons";
import { pressablePanelClass } from "@/lib/ui/classes";
import { cn } from "@/lib/utils";
import { clubCoversService, clubWeekdayHint, type BookingClub } from "@/lib/club";
import type { BookingService } from "./types";

export function ServiceStep({
  services,
  club,
  onSelect,
}: {
  services: BookingService[];
  club?: BookingClub | null;
  onSelect: (service: BookingService) => void;
}) {
  const weekdayHint = clubWeekdayHint(club);
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold tracking-tight">Qual serviço?</h2>
      {club && (
        <p className="flex items-start gap-2 rounded-md bg-teal-soft px-3 py-2 text-sm font-semibold text-cta-ink">
          <Crown className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Clube {club.planName}: {club.remaining > 0 ? `restam ${club.remaining} de ${club.total} atendimentos neste ciclo` : "atendimentos do ciclo esgotados"}
            {weekdayHint && <span className="block text-xs font-medium">{weekdayHint}. Nos outros dias o serviço é cobrado normalmente.</span>}
          </span>
        </p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2">
        {services.map((s) => {
          const Icon = getServiceIcon(s.name);
          const covered = clubCoversService(club, s.id);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s)}
                className={cn("flex w-full items-center gap-4 p-4 text-left", pressablePanelClass)}
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-teal-soft text-cta-ink">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-base font-bold">{s.name}</span>
                  {s.description && <span className="line-clamp-1 text-sm text-ink-subtle">{s.description}</span>}
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-subtle">
                    <Clock className="size-3.5" aria-hidden />
                    {s.durationMinutes} min
                  </span>
                  {covered && club && (
                    <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-teal-soft px-2 py-0.5 text-xs font-bold text-cta-ink">
                      <Crown className="size-3.5" aria-hidden />
                      Incluso no seu plano · restam {club.remaining}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className={cn("tabular text-base font-bold", covered && "text-ink-subtle line-through")}>
                    {formatPriceCents(s.priceCents)}
                  </span>
                  {covered && <span className="text-xs font-bold text-cta-ink">{weekdayHint ? "nos dias do plano" : "R$ 0,00 hoje"}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
