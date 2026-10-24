"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, MessageCircle, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";
import {
  cancelEntryAction,
  completeEntryAction,
  noShowEntryAction,
  registerLocalPaymentAction,
  removeBlockAction,
} from "@/app/actions/agenda";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPriceCents, formatSlotTime } from "@/lib/agenda/availability";
import { LOCAL_PAYMENT_LABELS, LOCAL_PAYMENT_METHODS } from "@/lib/validations/agendamento";
import { formatBrazilPhone, normalizeBrazilPhone } from "@/lib/phone";
import { ENTRY_STATUS_BADGE, paymentLabel } from "@/components/appointments/status";
import type { EntryPaymentMethod, EntryPaymentStatus, EntryStatus } from "@/server/db/schema";
import type { TimelineEntry } from "./agenda-day-timeline";

type ActionResult = { ok: boolean; error: string | null };

/** Ações sobre um item da agenda: concluir, falta, pagamento no balcão, cancelar. */
export function EntrySheet({
  entry,
  onClose,
  showBarber = false,
}: {
  entry: TimelineEntry | null;
  onClose: () => void;
  showBarber?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<ActionResult>, success: string) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) return void toast.error(result.error);
      toast.success(success);
      onClose();
      router.refresh();
    });
  }

  const open = entry !== null;
  const status = entry ? ENTRY_STATUS_BADGE[entry.status as EntryStatus] : null;
  const payment = entry
    ? paymentLabel(entry.paymentMethod as EntryPaymentMethod | null, entry.paymentStatus as EntryPaymentStatus | null)
    : null;
  const started = entry ? Date.parse(entry.starts_at) <= Date.now() : false;
  const booked = entry?.status === "booked";
  const phone = entry?.clientPhone ? normalizeBrazilPhone(entry.clientPhone).normalized : null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] rounded-t-[28px] border-0 bg-card px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 sm:mx-auto sm:max-w-lg"
      >
        {entry && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <SheetTitle className="text-xl font-extrabold">
                {entry.type === "block" ? "Bloqueio" : entry.clientName}
              </SheetTitle>
              <SheetDescription className="tabular text-sm text-ink-subtle">
                {formatSlotTime(entry.starts_at)} – {formatSlotTime(entry.ends_at)}
                {entry.type === "appointment" && ` · ${entry.serviceName ?? "Serviço"}`}
                {showBarber && ` · ${entry.barberName}`}
              </SheetDescription>
            </div>

            {entry.type === "appointment" ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {status && <Badge variant={status.variant}>{status.label}</Badge>}
                  {payment && <Badge variant={payment.variant}>{payment.label}</Badge>}
                  {entry.priceCents != null && (
                    <span className="tabular ml-auto text-lg font-extrabold">{formatPriceCents(entry.priceCents)}</span>
                  )}
                </div>

                {phone && (
                  <a
                    href={`https://wa.me/${phone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-md bg-muted px-4 py-3 text-sm font-semibold"
                  >
                    <MessageCircle className="size-5 text-success" aria-hidden />
                    {formatBrazilPhone(entry.clientPhone)}
                  </a>
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
                    <p className="text-sm font-bold">Recebeu no balcão?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {LOCAL_PAYMENT_METHODS.map((m) => (
                        <Button
                          key={m}
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() => run(() => registerLocalPaymentAction(entry.id, m), "Pagamento registrado.")}
                        >
                          {LOCAL_PAYMENT_LABELS[m]}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {booked && (
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm("Cancelar este agendamento? O cliente perde o horário.")) {
                        run(() => cancelEntryAction(entry.id), "Agendamento cancelado.");
                      }
                    }}
                  >
                    <Ban aria-hidden />
                    Cancelar agendamento
                  </Button>
                )}
              </>
            ) : (
              <>
                {entry.note && <p className="text-sm text-ink-muted">{entry.note}</p>}
                <Button
                  variant="outline"
                  className="text-destructive"
                  disabled={pending}
                  onClick={() => run(() => removeBlockAction(entry.id), "Bloqueio removido.")}
                >
                  <Trash2 aria-hidden />
                  Remover bloqueio
                </Button>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
