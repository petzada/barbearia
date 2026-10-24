import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import { requireOnboardedUser } from "@/server/auth";
import { listClientAppointments } from "@/server/scheduling";
import { getShopSettings } from "@/server/settings";
import { FEEDBACK_WINDOW_DAYS } from "@/server/feedback";
import { canClientCancel, formatMinutesShort } from "@/lib/agenda/availability";
import { EmptyState, PageBody, PageHeader } from "@/components/page-header";
import { AppointmentCard } from "@/components/appointments/appointment-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppointmentActions } from "./appointment-actions";

export const metadata: Metadata = { title: "Agendamentos" };

export default async function AgendamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { aba } = await searchParams;
  const tab = aba === "historico" ? "historico" : "proximos";
  const user = await requireOnboardedUser();
  const [db, env] = await Promise.all([getDb(), getServerEnv()]);
  const [all, settings] = await Promise.all([listClientAppointments(db, user.id), getShopSettings(db)]);
  const now = new Date();
  const upcoming = all
    .filter((a) => a.status === "booked" && a.startsAt >= now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const history = all.filter((a) => !(a.status === "booked" && a.startsAt >= now));
  const list = tab === "proximos" ? upcoming : history;
  const onlinePayment = Boolean(env.abacatePayApiKey);

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        title="Agendamentos"
        actions={
          <Link href="/agendar" className={cn(buttonVariants({ size: "sm" }))}>
            Novo
          </Link>
        }
      />
      <PageBody>
        <nav className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" aria-label="Filtrar agendamentos">
          {[
            { key: "proximos", label: `Próximos (${upcoming.length})`, href: "/agendamentos" },
            { key: "historico", label: "Histórico", href: "/agendamentos?aba=historico" },
          ].map((t) => (
            <Link
              key={t.key}
              href={t.href}
              aria-current={tab === t.key ? "page" : undefined}
              className={cn(
                "flex h-10 items-center justify-center rounded-md text-sm font-bold transition",
                tab === t.key ? "bg-card text-ink shadow-card" : "text-ink-subtle",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {list.length === 0 ? (
          <EmptyState
            title={tab === "proximos" ? "Nenhum horário marcado" : "Nada por aqui ainda"}
            description={tab === "proximos" ? "Que tal agendar o próximo corte?" : "Seus atendimentos aparecem aqui."}
            action={
              tab === "proximos" ? (
                <Link href="/agendar" className={buttonVariants()}>
                  Agendar agora
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {list.map((entry) => {
              const isUpcoming = entry.status === "booked" && entry.startsAt >= now;
              const canCancel = isUpcoming && canClientCancel(entry.startsAt, settings.cancelUntilMinutes, now);
              const canPay =
                isUpcoming && onlinePayment && entry.paymentStatus !== "paid" && entry.paymentMethod !== "subscription";
              const canReview =
                entry.status === "completed" &&
                !entry.hasFeedback &&
                now.getTime() - entry.startsAt.getTime() < FEEDBACK_WINDOW_DAYS * 86_400_000;
              const showActions = isUpcoming || canReview;
              return (
                <li key={entry.id}>
                  <AppointmentCard
                    entry={entry}
                    footer={
                      showActions ? (
                        <AppointmentActions
                          entryId={entry.id}
                          barberName={entry.barberName}
                          canCancel={canCancel}
                          cancelHint={
                            isUpcoming && !canCancel
                              ? `Cancelamento pelo app só até ${formatMinutesShort(settings.cancelUntilMinutes)} antes. Fale com a barbearia.`
                              : null
                          }
                          canPay={canPay}
                          hasPendingPix={Boolean(entry.pendingPixPaymentId)}
                          canReview={canReview}
                        />
                      ) : undefined
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </PageBody>
    </main>
  );
}
