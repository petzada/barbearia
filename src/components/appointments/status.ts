import type { EntryStatus } from "@/server/db/schema";
import { entryPaymentBadge } from "@/lib/payments";

type BadgeVariant = "soft" | "success" | "warning" | "muted" | "destructive";

/** Status do agendamento → rótulo + variante (fonte única de cor de status). */
export const ENTRY_STATUS_BADGE: Record<EntryStatus, { label: string; variant: BadgeVariant }> = {
  booked: { label: "Confirmado", variant: "soft" },
  completed: { label: "Concluído", variant: "success" },
  no_show: { label: "Falta", variant: "warning" },
  cancelled: { label: "Cancelado", variant: "muted" },
};

/** Cor de marcação (barra/borda) derivada do mesmo mapa. */
export const STATUS_ACCENT: Record<BadgeVariant, { bar: string; text: string }> = {
  soft: { bar: "bg-cta", text: "text-cta-ink" },
  success: { bar: "bg-success", text: "text-success-ink" },
  warning: { bar: "bg-warning", text: "text-warning-ink" },
  muted: { bar: "bg-ink-tertiary", text: "text-ink-subtle" },
  destructive: { bar: "bg-destructive", text: "text-destructive" },
};

export { entryPaymentBadge as paymentLabel };
