import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronRight, Crown, MapPin, QrCode } from "lucide-react";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import { requireOnboardedUser } from "@/server/auth";
import { listClientAppointments } from "@/server/scheduling";
import { getShopSettings } from "@/server/settings";
import { getActiveSubscription, listPlans } from "@/server/payments/service";
import { PageBody, PageHeader, SectionTitle } from "@/components/page-header";
import { AppointmentCard } from "@/components/appointments/appointment-card";
import { BarberAvatar } from "@/components/booking/barber-avatar";
import { buttonVariants } from "@/components/ui/button";
import { getFirstName } from "@/lib/profile/display-name";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Início" };

export default async function InicioPage() {
  const user = await requireOnboardedUser();
  const [db, env] = await Promise.all([getDb(), getServerEnv()]);
  const [upcoming, subscription, plans, settings] = await Promise.all([
    listClientAppointments(db, user.id, { upcomingOnly: true }),
    getActiveSubscription(db, user.id),
    listPlans(db),
    getShopSettings(db),
  ]);
  const next = upcoming[0];
  const canPayPix =
    next &&
    Boolean(env.abacatePayApiKey) &&
    next.paymentStatus !== "paid" &&
    next.paymentMethod !== "subscription";
  const mapsHref = settings.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${settings.shopName}, ${settings.address}`)}`
    : null;

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        title={`Oi, ${getFirstName(user.name)}!`}
        description={next ? "Seu próximo horário já está marcado." : "Bora marcar o próximo corte?"}
        actions={
          <Link href="/perfil" aria-label="Meu perfil">
            <BarberAvatar name={user.name} image={user.image} size="sm" />
          </Link>
        }
      />

      <PageBody className="gap-8">
        {next ? (
          <section aria-label="Próximo horário" className="flex flex-col gap-3">
            <SectionTitle
              action={
                <Link href="/agendamentos" className="text-sm font-bold text-cta-ink">
                  Ver todos
                </Link>
              }
            >
              Próximo horário
            </SectionTitle>
            <AppointmentCard
              entry={next}
              featured
              footer={
                (mapsHref || canPayPix) && (
                  <div className="grid grid-cols-2 gap-2 border-t border-hairline pt-4">
                    {mapsHref && (
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), canPayPix ? "" : "col-span-2")}
                      >
                        <MapPin aria-hidden />
                        Como chegar
                      </a>
                    )}
                    {canPayPix && (
                      <Link
                        href={`/agendamentos/${next.id}/pix`}
                        className={cn(buttonVariants({ size: "sm" }), mapsHref ? "" : "col-span-2")}
                      >
                        <QrCode aria-hidden />
                        Pagar Pix
                      </Link>
                    )}
                  </div>
                )
              }
            />
          </section>
        ) : (
          <Link
            href="/agendar"
            className="flex items-center justify-between gap-4 rounded-lg bg-card p-6 shadow-card transition active:scale-[0.99]"
          >
            <div>
              <p className="text-xl font-extrabold">Agendar horário</p>
              <p className="text-sm text-ink-subtle">Escolha o barbeiro, o serviço e o horário.</p>
            </div>
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-cta text-cta-foreground">
              <ArrowRight className="size-6" aria-hidden />
            </span>
          </Link>
        )}

        {!subscription && plans.length > 0 && (
          <Link href="/clube" className="flex items-center gap-4 rounded-lg bg-surface-dark p-5 text-on-dark shadow-card">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-on-dark/10 text-cta-on-dark">
              <Crown className="size-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold">Clube Moura</span>
              <span className="text-sm text-on-dark/70">Assine e economize em todo corte.</span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-on-dark/70" aria-hidden />
          </Link>
        )}
      </PageBody>
    </main>
  );
}
