"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, QrCode, RotateCcw, Star } from "lucide-react";
import { toast } from "sonner";
import { cancelMyAppointmentAction, submitFeedbackAction } from "@/app/actions/cliente";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  dateKeyFromIsoInSP,
  formatPriceCents,
  formatSelectableDay,
  formatSlotTime,
} from "@/lib/agenda/availability";
import { cn } from "@/lib/utils";
import type { EntryPaymentMethod, EntryPaymentStatus, EntryStatus } from "@/server/db/schema";
import { ENTRY_STATUS_BADGE, paymentLabel } from "./status";

export type AppointmentListItem = {
  id: string;
  startsAt: number;
  endsAt: number;
  status: EntryStatus;
  serviceId: string | null;
  serviceName: string | null;
  barberId: string;
  barberName: string;
  priceCents: number | null;
  paymentMethod: EntryPaymentMethod | null;
  paymentStatus: EntryPaymentStatus | null;
  canCancel: boolean;
  cancelHint: string | null;
  canPay: boolean;
  hasPendingPix: boolean;
  canReview: boolean;
};

const STATUS_DOT: Record<EntryStatus, string> = {
  booked: "bg-cta",
  completed: "bg-success",
  no_show: "bg-warning",
  cancelled: "bg-ink-tertiary",
};

/** Lista compacta; tocar abre a folha com detalhes e ações. */
export function AppointmentsList({ items }: { items: AppointmentListItem[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((i) => i.id === selectedId) ?? null;

  return (
    <>
      <ul className="divide-y divide-hairline overflow-hidden rounded-lg bg-card shadow-card">
        {items.map((item) => {
          const status = ENTRY_STATUS_BADGE[item.status];
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelectedId(item.id)}
                className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition active:bg-muted"
              >
                <span className="flex w-14 shrink-0 flex-col items-center">
                  <span className="text-[11px] font-bold uppercase text-ink-subtle">
                    {formatSelectableDay(dateKeyFromIsoInSP(item.startsAt)).split(",")[0]}
                  </span>
                  <span className="tabular text-base font-extrabold">{formatSlotTime(item.startsAt)}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-bold">{item.serviceName ?? "Serviço"}</span>
                  <span className="truncate text-sm text-ink-subtle">
                    {item.barberName} · {formatSelectableDay(dateKeyFromIsoInSP(item.startsAt)).split(", ")[1]}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-ink-subtle">
                  <span className={cn("size-2 rounded-full", STATUS_DOT[item.status])} aria-hidden />
                  {status.label}
                </span>
                <ChevronRight className="size-4 shrink-0 text-ink-tertiary" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      <AppointmentSheet item={selected} onClose={() => setSelectedId(null)} />
    </>
  );
}

export function AppointmentSheet({ item, onClose }: { item: AppointmentListItem | null; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  function close() {
    setConfirmCancel(false);
    setRating(0);
    setComment("");
    onClose();
  }

  function cancel() {
    if (!item) return;
    startTransition(async () => {
      const result = await cancelMyAppointmentAction(item.id);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Agendamento cancelado.");
      close();
      router.refresh();
    });
  }

  function review() {
    if (!item) return;
    startTransition(async () => {
      const result = await submitFeedbackAction({ entryId: item.id, rating, comment });
      if (!result.ok) return void toast.error(result.error);
      toast.success("Obrigado pela avaliação!");
      close();
      router.refresh();
    });
  }

  const status = item ? ENTRY_STATUS_BADGE[item.status] : null;
  const payment =
    item && (item.status === "booked" || item.status === "completed")
      ? paymentLabel(item.paymentMethod, item.paymentStatus)
      : null;
  const rebookHref =
    item?.serviceId ? `/agendar?barbeiro=${item.barberId}&servico=${item.serviceId}` : "/agendar";

  return (
    <Sheet open={item !== null} onOpenChange={(open) => !open && close()}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-[28px] border-0 bg-background p-0 sm:mx-auto sm:max-w-lg"
      >
        {item && (
          <div className="flex flex-col gap-5 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-6">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-hairline-strong" aria-hidden />
            <div className="flex items-start justify-between gap-3">
              <div>
                <SheetTitle className="text-xl font-extrabold">{item.serviceName ?? "Serviço"}</SheetTitle>
                <SheetDescription className="text-sm text-ink-subtle">com {item.barberName}</SheetDescription>
              </div>
              {item.priceCents != null && (
                <span className="tabular text-xl font-extrabold">{formatPriceCents(item.priceCents)}</span>
              )}
            </div>

            <div className="flex flex-col gap-3 rounded-lg bg-card p-5 shadow-card">
              <p className="font-bold capitalize">
                {formatSelectableDay(dateKeyFromIsoInSP(item.startsAt))} · {formatSlotTime(item.startsAt)}–
                {formatSlotTime(item.endsAt)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {status && <Badge variant={status.variant}>{status.label}</Badge>}
                {payment && <Badge variant={payment.variant}>{payment.label}</Badge>}
              </div>
            </div>

            {item.canPay && (
              <Link href={`/agendamentos/${item.id}/pix`} className={buttonVariants({ size: "lg", className: "w-full" })}>
                <QrCode aria-hidden />
                {item.hasPendingPix ? "Ver Pix" : "Pagar com Pix"}
              </Link>
            )}

            {item.canReview && (
              <section aria-label="Avaliar atendimento" className="flex flex-col gap-3 rounded-lg bg-card p-5 shadow-card">
                <p className="font-bold">Como foi com {item.barberName}?</p>
                <div className="flex justify-center gap-1" role="radiogroup" aria-label="Nota de 1 a 5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={rating === n}
                      aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
                      onClick={() => setRating(n)}
                      className="flex size-12 items-center justify-center rounded-full transition active:scale-90"
                    >
                      <Star
                        className={cn("size-8", n <= rating ? "fill-warning text-warning" : "text-hairline-strong")}
                        aria-hidden
                      />
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Quer deixar um comentário? (opcional)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={500}
                />
                <Button onClick={review} disabled={pending || rating === 0}>
                  {pending ? "Enviando…" : "Enviar avaliação"}
                </Button>
              </section>
            )}

            {(item.status !== "booked" || !item.canPay) && (
              <Link href={rebookHref} className={buttonVariants({ size: "lg", variant: "outline", className: "w-full" })}>
                <RotateCcw aria-hidden />
                Agendar de novo
              </Link>
            )}

            {item.canCancel &&
              (confirmCancel ? (
                <div className="flex flex-col gap-2 rounded-lg bg-destructive/8 p-4">
                  <p className="text-sm font-semibold">Cancelar este horário? Ele fica livre para outra pessoa.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => setConfirmCancel(false)} disabled={pending}>
                      Manter
                    </Button>
                    <Button variant="destructive" onClick={cancel} disabled={pending}>
                      Sim, cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" className="text-destructive" onClick={() => setConfirmCancel(true)}>
                  Cancelar agendamento
                </Button>
              ))}
            {item.cancelHint && <p className="text-center text-xs text-ink-subtle">{item.cancelHint}</p>}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
