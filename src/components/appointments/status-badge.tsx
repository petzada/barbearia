import { Badge } from "@/components/ui/badge";
import type { EntryPaymentMethod, EntryPaymentStatus, EntryStatus } from "@/server/db/schema";
import { entryPaymentBadge } from "@/lib/payments";
import { ENTRY_STATUS_BADGE } from "./status";

/** Badge único de status do agendamento (lista, card, folha e agenda). */
export function StatusBadge({ status, size = "default" }: { status: EntryStatus; size?: "default" | "sm" }) {
  const badge = ENTRY_STATUS_BADGE[status];
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
