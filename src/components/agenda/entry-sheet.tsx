"use client";

import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, ChevronRight, MessageCircle, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";
import {
  cancelEntryAction,
  completeEntryAction,
  noShowEntryAction,
  registerLocalPaymentAction,
  removeBlockAction,
} from "@/app/actions/agenda";
import { BottomSheet } from "@/components/kit/bottom-sheet";
import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { Button } from "@/components/ui/button";
import { PaymentBadge, StatusBadge } from "@/components/appointments/status-badge";
import { formatPriceCents } from "@/lib/agenda/availability";
import { formatTimeRange } from "@/lib/agenda/format";
import { LOCAL_PAYMENT_METHODS } from "@/lib/validations/agendamento";
import { LOCAL_PAYMENT_SHORT_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/payments";
import { formatBrazilPhone, normalizeBrazilPhone } from "@/lib/phone";
import { rowClass, rowGroupClass, rowIconClass } from "@/lib/ui/classes";
import { FieldLabel } from "@/components/kit/field-label";
import type { EntryPaymentMethod, EntryPaymentStatus, EntryStatus } from "@/server/db/schema";
import type { TimelineEntry } from "./agenda-day-timeline";
import { useBusyTransition } from "@/components/loading/busy";

type ActionResult = { ok: boolean; error: string | null };

/** Ações sobre um item da agenda: concluir, falta, pagamento no balcão, cancelar. */
export function EntrySheet({
  entry,
  open = entry !== null,
  onClose,
  showBarber = false,
  openedAt,
}: {
  entry: TimelineEntry | null;
  /** Aberta? O `entry` deve continuar preenchido durante a animação de saída. */
  open?: boolean;
  onClose: () => void;
  showBarber?: boolean;
  /** Instante em que a folha foi aberta (decide se já dá para concluir). */
  openedAt: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useBusyTransition();

  function run(fn: () => Promise<ActionResult>, success: string) {
    return new Promise<boolean>((resolve) =>
      startTransition(async () => {
        const result = await fn();
        if (!result.ok) {
          toast.error(result.error);
          return resolve(false);
        }
        toast.success(success);
        onClose();
        router.refresh();
        resolve(true);
      }),
    );
  }

  const started = entry ? Date.parse(entry.starts_at) <= openedAt : false;
  const booked = entry?.status === "booked";
  const phone = entry?.clientPhone ? normalizeBrazilPhone(entry.clientPhone).normalized : null;
  const isAppointment = entry?.type === "appointment";
  const subtitle = entry
    ? [
        formatTimeRange(entry.starts_at, entry.ends_at),
        isAppointment ? (entry.serviceName ?? "Serviço") : null,
        showBarber ? entry.barberName : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={entry ? (isAppointment ? entry.clientName : "Bloqueio") : ""}
      description={subtitle}
      headerRight={
        isAppointment && entry?.priceCents != null ? (
          <span className="tabular text-lg font-extrabold">{formatPriceCents(entry.priceCents)}</span>
        ) : undefined
      }
    >
      {entry && isAppointment && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={entry.status as EntryStatus} />
            <PaymentBadge
              method={entry.paymentMethod as EntryPaymentMethod | null}
              status={entry.paymentStatus as EntryPaymentStatus | null}
            />
          </div>

          {phone && (
            <div className={rowGroupClass}>
              <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" className={rowClass}>
                <span className={rowIconClass}>
                  <MessageCircle aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-bold">Chamar no WhatsApp</span>
                  <span className="text-sm text-ink-subtle">{formatBrazilPhone(entry.clientPhone)}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-ink-tertiary" aria-hidden />
              </a>
            </div>
          )}

          {booked && started && (
            <div className="grid grid-cols-2 gap-2">
              <Button disabled={pending} onClick={() => run(() => completeEntryAction(entry.id), "Atendimento concluído.")}>
                <CheckCircle2 aria-hidden />
                Concluir
              </Button>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => run(() => noShowEntryAction(entry.id), "Falta registrada.")}
              >
                <UserX aria-hidden />
                Faltou
              </Button>
            </div>
          )}

          {entry.status !== "cancelled" && entry.paymentStatus !== "paid" && entry.paymentMethod !== "subscription" && (
            <div className="flex flex-col gap-2">
              <FieldLabel>Recebeu no balcão?</FieldLabel>
              <div className="grid grid-cols-3 gap-2">
                {LOCAL_PAYMENT_METHODS.map((m) => (
                  <Button
                    key={m}
                    variant="outline"
                    aria-label={`Registrar pagamento: ${PAYMENT_METHOD_LABELS[m]}`}
                    disabled={pending}
                    onClick={() => run(() => registerLocalPaymentAction(entry.id, m), "Pagamento registrado.")}
                  >
                    {LOCAL_PAYMENT_SHORT_LABELS[m]}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {booked && (
            <ConfirmDialog
              trigger={
                <Button variant="ghost" className="text-destructive" disabled={pending}>
                  <Ban aria-hidden />
                  Cancelar agendamento
                </Button>
              }
              title="Cancelar este agendamento?"
              description="O cliente perde o horário e ele fica livre para outra pessoa."
              confirmLabel="Cancelar agendamento"
              onConfirm={() => run(() => cancelEntryAction(entry.id), "Agendamento cancelado.")}
            />
          )}
        </>
      )}

      {entry && !isAppointment && (
        <>
          {entry.note && <p className="text-sm text-ink-muted">{entry.note}</p>}
          <ConfirmDialog
            trigger={
              <Button variant="ghost" className="text-destructive" disabled={pending}>
                <Trash2 aria-hidden />
                Remover bloqueio
              </Button>
            }
            title="Remover este bloqueio?"
            description="O horário volta a ficar livre para agendamentos."
            confirmLabel="Remover bloqueio"
            onConfirm={() => run(() => removeBlockAction(entry.id), "Bloqueio removido.")}
          />
        </>
      )}
    </BottomSheet>
  );
}
