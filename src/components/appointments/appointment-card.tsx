import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  dateKeyFromIsoInSP,
  formatPriceCents,
  formatSelectableDay,
  formatSlotTime,
} from "@/lib/agenda/availability";
import { cn } from "@/lib/utils";
import type { EntryPaymentMethod, EntryPaymentStatus, EntryStatus } from "@/server/db/schema";
import { ENTRY_STATUS_BADGE, paymentLabel } from "./status";

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
  const dayLabel = formatSelectableDay(dateKeyFromIsoInSP(entry.startsAt)); // ex.: "seg., 02/11"
  const status = ENTRY_STATUS_BADGE[entry.status];
  const payment = entry.status === "booked" || entry.status === "completed"
    ? paymentLabel(entry.paymentMethod, entry.paymentStatus)
    : null;

  return (
    <article className={cn("flex flex-col gap-4 rounded-lg bg-card p-5 shadow-card", featured && "ring-2 ring-cta/15")}>
      <div className="flex items-start gap-4">
        <div className="flex w-16 shrink-0 flex-col items-center rounded-md bg-teal-soft py-2 text-cta">
          <span className="text-[11px] font-bold uppercase">{dayLabel.split(",")[0]}</span>
          <span className="tabular text-lg font-extrabold leading-tight">{formatSlotTime(entry.startsAt)}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className={cn("font-bold", featured ? "text-lg" : "text-base")}>{entry.serviceName ?? "Serviço"}</p>
          <p className="text-sm text-ink-subtle">
            {entry.barberName} · <span className="capitalize">{dayLabel}</span>
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge variant={status.variant}>{status.label}</Badge>
            {payment && <Badge variant={payment.variant}>{payment.label}</Badge>}
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
