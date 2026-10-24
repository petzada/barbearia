import { ChevronRight } from "lucide-react";
import { pressablePanelClass } from "@/lib/ui/classes";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/page-header";
import { BarberAvatar } from "./barber-avatar";
import type { BookingBarber } from "./types";

export function BarberStep({
  barbers,
  onSelect,
}: {
  barbers: BookingBarber[];
  onSelect: (barber: BookingBarber) => void;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold tracking-tight">Com quem você quer cortar?</h2>
      {barbers.length === 0 ? (
        <EmptyState
          title="Nenhum barbeiro disponível"
          description="No momento ninguém está recebendo agendamentos online. Fale com a barbearia."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {barbers.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onSelect(b)}
                className={cn("flex w-full items-center gap-4 p-4 text-left", pressablePanelClass)}
              >
                <BarberAvatar name={b.name} image={b.image} />
                <span className="min-w-0 flex-1 text-base font-bold">{b.name}</span>
                <ChevronRight className="size-5 shrink-0 text-ink-tertiary" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
