import { Badge } from "@/components/ui/badge";
import type { EntryPaymentMethod, EntryPaymentStatus, EntryStatus } from "@/server/db/schema";
import { entryPaymentBadge } from "@/lib/payments";
import { ENTRY_STATUS_BADGE } from "./status";

/**
 * Badge único de status do agendamento (lista, card, folha e agenda).
 * `past`: horário já passou — "booked" vira "Aguardando conclusão" até o
 * barbeiro concluir ou marcar falta.
 */
export function StatusBadge({
  status,
  past = false,
  size = "default",
}: {
  status: EntryStatus;
  past?: boolean;
  size?: "default" | "sm";
}) {
  const badge =
    status === "booked" && past ? { label: "Aguardando conclusão", variant: "warning" as const } : ENTRY_STATUS_BADGE[status];
  return (
    <Badge variant={badge.variant} size={size}>
      {badge.label}
    </Badge>
  );
}

/** Badge da situação do pagamento (some quando não se aplica). */
export function PaymentBadge({
  method,
  status,
  size = "default",
}: {
  method: EntryPaymentMethod | null;
  status: EntryPaymentStatus | null;
  size?: "default" | "sm";
}) {
  const badge = entryPaymentBadge(method, status);
  if (!badge) return null;
  return (
    <Badge variant={badge.variant} size={size}>
      {badge.label}
    </Badge>
  );
}
