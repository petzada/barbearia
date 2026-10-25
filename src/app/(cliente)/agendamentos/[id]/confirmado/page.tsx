import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, CheckCircle2 } from "lucide-react";
import { getDb } from "@/server/db";
import { requireOnboardedUser } from "@/server/auth";
import { getClientAppointment } from "@/server/scheduling";
import { BarberAvatar } from "@/components/booking/barber-avatar";
import { buttonVariants } from "@/components/ui/button";
import { PaymentBadge } from "@/components/appointments/status-badge";
import { formatPriceCents, formatSlotTime } from "@/lib/agenda/availability";
import { formatDayLabel } from "@/lib/agenda/format";
import { getFirstName } from "@/lib/profile/display-name";

export const metadata: Metadata = { title: "Agendamento confirmado" };

export default async function ConfirmadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireOnboardedUser();
  const entry = await getClientAppointment(await getDb(), user.id, id);
  if (!entry) notFound();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-6 px-5 pb-8 pt-[calc(3rem+env(safe-area-inset-top))] text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-success/12">
        <CheckCircle2 className="size-12 text-success-ink" aria-hidden />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">Tudo certo, {getFirstName(user.name)}!</h1>
        <p className="text-[15px] text-ink-subtle">Seu horário está confirmado. Esperamos você!</p>
      </div>

      <div className="flex w-full flex-col gap-4 rounded-lg bg-card p-5 text-left shadow-card">
        <div className="flex items-center gap-3">
          <BarberAvatar name={entry.barberName} image={entry.barberImage} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="font-bold">{entry.serviceName}</p>
            <p className="text-sm text-ink-subtle">com {entry.barberName}</p>
          </div>
          {entry.priceCents != null && <span className="tabular font-extrabold">{formatPriceCents(entry.priceCents)}</span>}
        </div>
        <div className="flex items-center justify-between border-t border-hairline pt-4 text-sm">
          <span className="font-bold">
            {formatDayLabel(entry.startsAt)} · {formatSlotTime(entry.startsAt)}
          </span>
          <PaymentBadge method={entry.paymentMethod} status={entry.paymentStatus} />
        </div>
      </div>

      <div className="mt-auto flex w-full flex-col gap-2">
        <a href={`/agendamentos/${entry.id}/ics`} className={buttonVariants({ size: "lg", variant: "outline", className: "w-full" })}>
          <CalendarPlus aria-hidden />
          Adicionar à agenda
        </a>
        <Link href="/agendamentos" className={buttonVariants({ size: "lg", className: "w-full" })}>
          Ver meus agendamentos
        </Link>
      </div>
    </main>
  );
}
