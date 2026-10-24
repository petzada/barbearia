import { Clock } from "lucide-react";
import { formatPriceCents } from "@/lib/agenda/availability";
import { getServiceIcon } from "@/lib/services/icons";
import { pressablePanelClass } from "@/lib/ui/classes";
import { cn } from "@/lib/utils";
import type { BookingService } from "./types";

export function ServiceStep({
  services,
  onSelect,
}: {
  services: BookingService[];
  onSelect: (service: BookingService) => void;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold tracking-tight">Qual serviço?</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {services.map((s) => {
          const Icon = getServiceIcon(s.name);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s)}
                className={cn("flex w-full items-center gap-4 p-4 text-left", pressablePanelClass)}
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-teal-soft text-cta">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-base font-bold">{s.name}</span>
                  {s.description && <span className="line-clamp-1 text-sm text-ink-subtle">{s.description}</span>}
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-subtle">
                    <Clock className="size-3.5" aria-hidden />
                    {s.durationMinutes} min
                  </span>
                </span>
                <span className="tabular shrink-0 text-base font-bold">{formatPriceCents(s.priceCents)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
