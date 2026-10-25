import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, History } from "lucide-react";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import { requireOnboardedUser } from "@/server/auth";
import { listClientAppointments } from "@/server/scheduling";
import { getShopSettings } from "@/server/settings";
import { FEEDBACK_WINDOW_DAYS } from "@/server/feedback";
import { canClientCancel, formatMinutesShort } from "@/lib/agenda/availability";
import { EmptyState, PageBody, PageHeader } from "@/components/page-header";
import { AppointmentsList, type AppointmentListItem } from "@/components/appointments/appointments-list";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Agendamentos" };

export default async function AgendamentosPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba } = await searchParams;
  const tab = aba === "historico" ? "historico" : "proximos";
  const user = await requireOnboardedUser();
  const [db, env] = await Promise.all([getDb(), getServerEnv()]);
  const [all, settings] = await Promise.all([listClientAppointments(db, user.id), getShopSettings(db)]);
  const now = new Date();
  const isUpcoming = (a: (typeof all)[number]) => a.status === "booked" && a.startsAt >= now;
  const upcoming = all.filter(isUpcoming).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const history = all.filter((a) => !isUpcoming(a));
  const onlinePayment = Boolean(env.abacatePayApiKey);

  const items: AppointmentListItem[] = (tab === "proximos" ? upcoming : history).map((entry) => {
    const upcomingEntry = isUpcoming(entry);
    const canCancel = upcomingEntry && canClientCancel(entry.startsAt, settings.cancelUntilMinutes, now);
    return {
      id: entry.id,
      startsAt: entry.startsAt.getTime(),
      endsAt: entry.endsAt.getTime(),
      status: entry.status,
      serviceId: entry.serviceId,
      serviceName: entry.serviceName,
      barberId: entry.barberId,
      barberName: entry.barberName,
      priceCents: entry.priceCents,
      paymentMethod: entry.paymentMethod,
      paymentStatus: entry.paymentStatus,
      canCancel,
      cancelHint:
        upcomingEntry && !canCancel
          ? `Cancelamento pelo app só até ${formatMinutesShort(settings.cancelUntilMinutes)} antes. Fale com a barbearia.`
          : null,
      canPay:
        upcomingEntry && onlinePayment && entry.paymentStatus !== "paid" && entry.paymentMethod !== "subscription",
      hasPendingPix: Boolean(entry.pendingPixPaymentId),
      canReview:
        entry.status === "completed" &&
        !entry.hasFeedback &&
        now.getTime() - entry.startsAt.getTime() < FEEDBACK_WINDOW_DAYS * 86_400_000,
    };
  });

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
            { key: "proximos", label: `Próximos${upcoming.length ? ` (${upcoming.length})` : ""}`, href: "/agendamentos" },
            { key: "historico", label: "Histórico", href: "/agendamentos?aba=historico" },
          ].map((t) => (
            <Link
              key={t.key}
              href={t.href}
              aria-current={tab === t.key ? "page" : undefined}
              className={cn(
                "flex h-11 items-center justify-center rounded-md text-sm font-bold transition",
                tab === t.key ? "bg-card text-ink shadow-card" : "text-ink-subtle",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {items.length === 0 ? (
          tab === "proximos" ? (
            <EmptyState
              icon={CalendarDays}
              title="Nenhum horário marcado"
              description="Que tal agendar o próximo corte?"
              action={
                <Link href="/agendar" className={buttonVariants()}>
                  Agendar agora
                </Link>
              }
            />
          ) : (
            <EmptyState icon={History} title="Nada por aqui ainda" description="Seus atendimentos anteriores aparecem aqui." />
          )
        ) : (
          <AppointmentsList items={items} />
        )}
      </PageBody>
    </main>
  );
}
