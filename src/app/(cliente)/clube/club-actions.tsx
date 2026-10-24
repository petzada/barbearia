"use client";

import { useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { cancelMySubscriptionAction, subscribeAction } from "@/app/actions/cliente";
import { Button } from "@/components/ui/button";
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

export function ClubActions(
  props: { mode: "subscribe"; planId: string } | { mode: "cancel"; subscriptionId: string },
) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (props.mode === "subscribe") {
    return (
      <Button
        className="w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await subscribeAction(props.planId);
            if (!result.ok) return void toast.error(result.error);
            window.location.href = result.data.url;
          })
        }
      >
        {pending ? "Abrindo pagamento…" : "Assinar"}
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="outline" size="sm" className="border-white/20 bg-transparent text-white hover:bg-white/10" />}
      >
        Cancelar assinatura
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
          <AlertDialogDescription>
            O cancelamento vale na hora e não haverá novas cobranças.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Manter</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              startTransition(async () => {
                const result = await cancelMySubscriptionAction(props.subscriptionId);
                if (!result.ok) return void toast.error(result.error);
                toast.success("Assinatura cancelada.");
                router.refresh();
              })
            }
          >
            Sim, cancelar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Retorno do checkout do AbacatePay (`/clube?assinatura=ok`). */
export function SubscriptionReturnToast() {
  const params = useSearchParams();
  const router = useRouter();
  const ok = params.get("assinatura") === "ok";
  useEffect(() => {
    if (!ok) return;
    toast.success("Pagamento recebido! Sua assinatura será ativada em instantes.");
    const id = setTimeout(() => router.replace("/clube"), 4000);
    return () => clearTimeout(id);
  }, [ok, router]);
  return null;
}
