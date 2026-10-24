"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QrCode, Star } from "lucide-react";
import { toast } from "sonner";
import { cancelMyAppointmentAction, submitFeedbackAction } from "@/app/actions/cliente";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function AppointmentActions({
  entryId,
  barberName,
  canCancel,
  cancelHint,
  canPay,
  hasPendingPix,
  canReview,
}: {
  entryId: string;
  barberName: string;
  canCancel: boolean;
  cancelHint: string | null;
  canPay: boolean;
  hasPendingPix: boolean;
  canReview: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function cancel() {
    startTransition(async () => {
      const result = await cancelMyAppointmentAction(entryId);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Agendamento cancelado.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 border-t border-hairline pt-4">
      <div className="flex flex-wrap gap-2">
        {canPay && (
          <Link href={`/agendamentos/${entryId}/pix`} className={cn(buttonVariants({ size: "sm" }), "flex-1")}>
            <QrCode aria-hidden />
            {hasPendingPix ? "Ver Pix" : "Pagar com Pix"}
          </Link>
        )}
        {canCancel && (
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="outline" size="sm" className="flex-1" disabled={pending} />}>
              Cancelar
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
                <AlertDialogDescription>O horário fica livre para outra pessoa.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Manter</AlertDialogCancel>
                <AlertDialogAction onClick={cancel}>Sim, cancelar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {canReview && <FeedbackDialog entryId={entryId} barberName={barberName} />}
      </div>
      {cancelHint && <p className="text-xs text-ink-subtle">{cancelHint}</p>}
    </div>
  );
}

function FeedbackDialog({ entryId, barberName }: { entryId: string; barberName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await submitFeedbackAction({ entryId, rating, comment });
      if (!result.ok) return void toast.error(result.error);
      toast.success("Obrigado pela avaliação!");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="flex-1" />}>
        <Star aria-hidden />
        Avaliar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Como foi com {barberName}?</DialogTitle>
          <DialogDescription>Sua nota ajuda a barbearia a melhorar.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-2" role="radiogroup" aria-label="Nota de 1 a 5">
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
        <Button onClick={submit} disabled={pending || rating === 0}>
          {pending ? "Enviando…" : "Enviar avaliação"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
