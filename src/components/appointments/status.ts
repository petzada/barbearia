import type { EntryPaymentMethod, EntryPaymentStatus, EntryStatus } from "@/server/db/schema";

type BadgeVariant = "soft" | "success" | "warning" | "muted" | "destructive";

export const ENTRY_STATUS_BADGE: Record<EntryStatus, { label: string; variant: BadgeVariant }> = {
  booked: { label: "Confirmado", variant: "soft" },
  completed: { label: "Concluído", variant: "success" },
  no_show: { label: "Falta", variant: "warning" },
  cancelled: { label: "Cancelado", variant: "muted" },
};

export function paymentLabel(
  method: EntryPaymentMethod | null,
  status: EntryPaymentStatus | null,
): { label: string; variant: BadgeVariant } | null {
  if (status === "paid") return { label: method === "pix" ? "Pago via Pix" : "Pago", variant: "success" };
  if (method === "subscription") return { label: "Clube", variant: "soft" };
  if (status === "pending") return { label: "Pix pendente", variant: "warning" };
  if (method === "local" || status === "unpaid") return { label: "Pagar no local", variant: "muted" };
  return null;
}
