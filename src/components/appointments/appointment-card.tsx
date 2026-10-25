import type { ReactNode } from "react";
import { formatPriceCents, formatSlotTime } from "@/lib/agenda/availability";
import { formatDayLabel, formatWeekdayShort } from "@/lib/agenda/format";
import { cn } from "@/lib/utils";
import type { EntryPaymentMethod, EntryPaymentStatus, EntryStatus } from "@/server/db/schema";
import { PaymentBadge, StatusBadge } from "./status-badge";

export type AppointmentCardData = {
  id: string;
  startsAt: Date;
  status: EntryStatus;
  serviceName: string | null;
  barberName: string;
  priceCents: number | null;
  paymentMethod: EntryPaymentMethod | null;
  paymentStatus: EntryPaymentStatus | null;
};

/** Card de agendamento do cliente: data em destaque, serviço, barbeiro e status. */
export function AppointmentCard({
  entry,
  featured = false,
  footer,
}: {
  entry: AppointmentCardData;
  featured?: boolean;
  footer?: ReactNode;
}) {
  const showPayment = entry.status === "booked" || entry.status === "completed";

  return (
    <article className={cn("flex flex-col gap-4 rounded-lg bg-card p-5 shadow-card", featured && "ring-2 ring-cta/15")}>
      <div className="flex items-start gap-4">
        <div className="flex w-16 shrink-0 flex-col items-center rounded-md bg-teal-soft py-2 text-cta-ink">
          <span className="text-[11px] font-bold uppercase">{formatWeekdayShort(entry.startsAt)}</span>
          <span className="tabular text-lg font-extrabold leading-tight">{formatSlotTime(entry.startsAt)}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className={cn("font-bold", featured ? "text-lg" : "text-base")}>{entry.serviceName ?? "Serviço"}</p>
          <p className="text-sm text-ink-subtle">
            {entry.barberName} · {formatDayLabel(entry.startsAt)}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <StatusBadge status={entry.status} />
            {showPayment && <PaymentBadge method={entry.paymentMethod} status={entry.paymentStatus} />}
          </div>
        </div>
        {entry.priceCents != null && (
          <span className="tabular shrink-0 text-base font-bold">{formatPriceCents(entry.priceCents)}</span>
        )}
      </div>
      {footer}
    </article>
  );
}
