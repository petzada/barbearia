"use client";

import { useState, useTransition } from "react";
import { useSheetState } from "@/components/kit/use-sheet-state";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, ChevronRight, QrCode, RotateCcw } from "lucide-react";
import { RatingInput } from "@/components/kit/rating-stars";
import { toast } from "sonner";
import { cancelMyAppointmentAction, submitFeedbackAction } from "@/app/actions/cliente";
import { BottomSheet } from "@/components/kit/bottom-sheet";
import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatPriceCents, formatSlotTime } from "@/lib/agenda/availability";
import { formatDayLabel, formatDayMonth, formatTimeRange, formatWeekdayShort } from "@/lib/agenda/format";
import { rowClass, rowGroupClass } from "@/lib/ui/classes";
import { cn } from "@/lib/utils";
import type { EntryPaymentMethod, EntryPaymentStatus, EntryStatus } from "@/server/db/schema";
import { PaymentBadge, StatusBadge } from "./status-badge";

export type AppointmentListItem = {
  id: string;
  startsAt: number;
  endsAt: number;
  status: EntryStatus;
  /** Horário já terminou (calculado no servidor; evita divergência na hidratação). */
  past: boolean;
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

/** Lista compacta; tocar abre a folha com detalhes e ações. */
export function AppointmentsList({ items }: { items: AppointmentListItem[] }) {
  const sheet = useSheetState<AppointmentListItem>();
  // Versão atualizada do item aberto; o último retrato segue visível ao fechar.
  const selected = items.find((i) => i.id === sheet.item?.id) ?? sheet.item;

  return (
    <>
      <ul className={rowGroupClass}>
        {items.map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => sheet.show(item)} className={cn(rowClass, "gap-4")}>
              <span className="flex w-14 shrink-0 flex-col items-center">
                <span className="text-[11px] font-bold uppercase text-ink-subtle">{formatWeekdayShort(item.startsAt)}</span>
                <span className="tabular text-base font-extrabold">{formatSlotTime(item.startsAt)}</span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="line-clamp-2 font-bold">{item.serviceName ?? "Serviço"}</span>
                <span className="truncate text-sm text-ink-subtle">
                  {item.barberName} · {formatDayMonth(item.startsAt)}
                </span>
              </span>
              <StatusBadge status={item.status} past={item.past} size="sm" />
              <ChevronRight className="size-4 shrink-0 text-ink-tertiary" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <AppointmentSheet item={selected} open={sheet.open} onClose={sheet.hide} />
    </>
  );
}

export function AppointmentSheet({
  item,
  open = item !== null,
  onClose,
}: {
  item: AppointmentListItem | null;
  /** Aberta? O `item` deve continuar preenchido durante a animação de saída. */
  open?: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  function close() {
    setRating(0);
    setComment("");
    onClose();
  }

  async function cancel() {
    if (!item) return;
    const result = await cancelMyAppointmentAction(item.id);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success("Agendamento cancelado.");
    close();
    router.refresh();
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

  const showPayment = item ? item.status === "booked" || item.status === "completed" : false;
  const rebookHref =
    item?.serviceId ? `/agendar?barbeiro=${item.barberId}&servico=${item.serviceId}` : "/agendar";

  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => !next && close()}
      title={item?.serviceName ?? "Serviço"}
      description={item ? `com ${item.barberName}` : undefined}
      headerRight={
        item?.priceCents != null ? (
          <span className="tabular text-xl font-extrabold">{formatPriceCents(item.priceCents)}</span>
        ) : undefined
      }
    >
      {item && (
        <>
          <div className="flex flex-col gap-3 rounded-lg bg-card p-5 shadow-card">
            <p className="font-bold">
              {formatDayLabel(item.startsAt)} · <span className="tabular">{formatTimeRange(item.startsAt, item.endsAt)}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge status={item.status} past={item.past} />
              {showPayment && <PaymentBadge method={item.paymentMethod} status={item.paymentStatus} />}
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
              <RatingInput value={rating} onChange={setRating} />
              <Textarea
                aria-label="Comentário"
                placeholder="Quer deixar um comentário? (opcional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
              />
              <Button size="lg" onClick={review} disabled={pending || rating === 0}>
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

          {item.canCancel && (
            <ConfirmDialog
              trigger={
                <Button variant="ghost" className="text-destructive">
                  <Ban aria-hidden />
                  Cancelar agendamento
                </Button>
              }
              title="Cancelar este agendamento?"
              description="O horário fica livre para outra pessoa."
              confirmLabel="Cancelar agendamento"
              onConfirm={cancel}
            />
          )}
          {item.cancelHint && <p className="text-center text-xs text-ink-subtle">{item.cancelHint}</p>}
        </>
      )}
    </BottomSheet>
  );
}
