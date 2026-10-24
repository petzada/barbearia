import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Crown, Star } from "lucide-react";
import { getDb } from "@/server/db";
import { requireOnboardedUser } from "@/server/auth";
import { listServices } from "@/server/catalog";
import { listClientAppointments } from "@/server/scheduling";
import { listPendingFeedback } from "@/server/feedback";
import { getActiveSubscription, listPlans } from "@/server/payments/service";
import { PageBody, PageHeader, SectionTitle } from "@/components/page-header";
import { HomePromoCarousel } from "@/components/home/home-promo-carousel";
import { ServiceIconStrip } from "@/components/home/service-icon-strip";
import { AppointmentCard } from "@/components/appointments/appointment-card";
import { BarberAvatar } from "@/components/booking/barber-avatar";
import { buttonVariants } from "@/components/ui/button";
import { getFirstName } from "@/lib/profile/display-name";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Início" };

export default async function InicioPage() {
  const user = await requireOnboardedUser();
  const db = await getDb();
  const [services, upcoming, pendingFeedback, subscription, plans] = await Promise.all([
    listServices(db),
    listClientAppointments(db, user.id, { upcomingOnly: true }),
    listPendingFeedback(db, user.id),
    getActiveSubscription(db, user.id),
    listPlans(db),
  ]);
  const next = upcoming[0];

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        variant="brand"
        title={`Oi, ${getFirstName(user.name)}!`}
        description={next ? "Seu próximo horário já está marcado." : "Bora marcar o próximo corte?"}
        actions={
          <Link href="/perfil" aria-label="Meu perfil">
            <BarberAvatar name={user.name} image={user.image} size="sm" className="ring-white/40" />
          </Link>
        }
      />

      <PageBody className="gap-8">
        <section aria-label="Próximo horário" className="flex flex-col gap-3">
          {next ? (
            <>
              <SectionTitle
                action={
                  <Link href="/agendamentos" className="text-sm font-bold text-cta">
                    Ver todos
                  </Link>
                }
              >
                Próximo horário
              </SectionTitle>
              <AppointmentCard entry={next} featured />
            </>
          ) : (
            <Link
              href="/agendar"
              className="flex items-center justify-between gap-4 rounded-lg bg-card p-5 shadow-card transition active:scale-[0.99]"
            >
              <div>
                <p className="text-lg font-bold">Agendar horário</p>
                <p className="text-sm text-ink-subtle">Escolha o barbeiro, o serviço e o horário.</p>
              </div>
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-cta text-cta-foreground">
                <ArrowRight className="size-5" aria-hidden />
              </span>
            </Link>
          )}
        </section>

        {pendingFeedback[0] && (
          <Link
            href="/agendamentos?aba=historico"
            className="flex items-center gap-4 rounded-lg bg-card p-4 shadow-card"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-warning/12 text-warning">
              <Star className="size-5" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block font-bold">Como foi com {pendingFeedback[0].barberName}?</span>
              <span className="text-sm text-ink-subtle">Avalie seu último atendimento.</span>
            </span>
          </Link>
        )}

        <section aria-label="Destaques">
          <HomePromoCarousel />
        </section>

        <section aria-label="Serviços" className="flex flex-col gap-4">
          <SectionTitle>Serviços</SectionTitle>
          <ServiceIconStrip services={services} />
        </section>

        {!subscription && plans.length > 0 && (
          <Link
            href="/clube"
            className="flex items-center gap-4 rounded-lg bg-ink p-5 text-white shadow-card"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-white/10 text-cta">
              <Crown className="size-6" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block text-lg font-bold">Clube Moura</span>
              <span className="text-sm text-white/70">Assine e economize em todo corte.</span>
            </span>
            <span className={cn(buttonVariants({ size: "sm" }), "shrink-0")}>Conhecer</span>
          </Link>
        )}
      </PageBody>
    </main>
  );
}
