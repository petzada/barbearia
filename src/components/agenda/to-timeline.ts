import type { AgendaItem } from "@/server/scheduling";
import type { TimelineEntry } from "./agenda-day-timeline";

/** Converte itens do servidor (Date) para o formato serializável da timeline. */
export function toTimelineEntries(items: AgendaItem[]): TimelineEntry[] {
  return items.map((i) => ({
    id: i.id,
    type: i.type,
    starts_at: i.startsAt.toISOString(),
    ends_at: i.endsAt.toISOString(),
    status: i.status,
    note: i.note,
    clientName: i.clientName ?? "Cliente",
    clientPhone: i.clientPhone,
    serviceName: i.serviceName,
    barberName: i.barberName,
    priceCents: i.priceCents,
    paymentMethod: i.paymentMethod,
    paymentStatus: i.paymentStatus,
  }));
}
