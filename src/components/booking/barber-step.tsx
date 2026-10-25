/* eslint-disable @next/next/no-img-element -- fotos vêm do R2 (/media). */
import Link from "next/link";
import { MessageCircle, Users } from "lucide-react";
import { RatingStars } from "@/components/kit/rating-stars";
import { getInitials } from "@/lib/profile/display-name";
import { EmptyState } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import type { BookingBarber } from "./types";

/** Etapa 1: barbeiros em grade de 2 colunas com foto quadrada grande. */
export function BarberStep({
  barbers,
  contactHref,
  onSelect,
}: {
  barbers: BookingBarber[];
  contactHref: string | null;
  onSelect: (barber: BookingBarber) => void;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold tracking-tight">Com quem você quer cortar?</h2>
      {barbers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum barbeiro disponível"
          description="No momento ninguém está recebendo agendamentos online."
          action={
            contactHref ? (
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
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {barbers.map((b) => {
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
                      <span className="flex size-full items-center justify-center text-4xl font-extrabold text-cta-ink">
                        {getInitials(b.name)}
                      </span>
                    )}
                  </span>
                  <span className="flex flex-col gap-0.5 p-3">
                    <span className="truncate text-base font-bold">{b.name}</span>
                    {b.ratingAverage != null ? (
                      <RatingStars rating={b.ratingAverage} variant="compact" average count={b.ratingCount} />
                    ) : (
                      <span className="text-sm font-semibold text-ink-subtle">Novo</span>
                    )}
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
