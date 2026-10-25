/* eslint-disable @next/next/no-img-element -- fotos vêm do R2 (/media). */
import { Star, Users } from "lucide-react";
import { getInitials } from "@/lib/profile/display-name";
import { cn, countLabel } from "@/lib/utils";
import { EmptyState } from "@/components/page-header";
import type { BookingBarber } from "./types";

export function formatRating(barber: Pick<BookingBarber, "ratingAverage" | "ratingCount">) {
  return barber.ratingAverage == null
    ? null
    : barber.ratingAverage.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Etapa 1: barbeiros em grade de 2 colunas com foto quadrada grande. */
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
          icon={Users}
          title="Nenhum barbeiro disponível"
          description="No momento ninguém está recebendo agendamentos online. Fale com a barbearia."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {barbers.map((b) => {
            const rating = formatRating(b);
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onSelect(b)}
                  className="group flex w-full flex-col overflow-hidden rounded-lg bg-card text-left shadow-card transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta/50"
                >
                  <span className="relative block aspect-square w-full overflow-hidden bg-teal-soft">
                    {b.image ? (
                      <img src={b.image} alt="" className="size-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <span className="flex size-full items-center justify-center text-4xl font-extrabold text-cta">
                        {getInitials(b.name)}
                      </span>
                    )}
                  </span>
                  <span className="flex flex-col gap-0.5 p-3">
                    <span className="truncate text-base font-bold">{b.name}</span>
                    <span className={cn("inline-flex items-center gap-1 text-sm font-semibold", rating ? "text-ink" : "text-ink-subtle")}>
                      {rating ? (
                        <>
                          <Star className="size-4 fill-warning text-warning" aria-hidden />
                          {rating}
                          <span className="sr-only">de 5 ({countLabel(b.ratingCount, "avaliação", "avaliações")})</span>
                        </>
                      ) : (
                        "Novo"
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
