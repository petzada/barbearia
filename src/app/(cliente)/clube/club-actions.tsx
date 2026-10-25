"use client";

import { useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { cancelMySubscriptionAction, subscribeAction } from "@/app/actions/cliente";
import { Button } from "@/components/ui/button";
import { Ban } from "lucide-react";
import { ConfirmDialog } from "@/components/kit/confirm-dialog";

export function ClubActions(
  props: { mode: "subscribe"; planId: string; highlighted?: boolean } | { mode: "cancel"; subscriptionId: string },
) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (props.mode === "subscribe") {
    return (
      <Button
        className="w-full"
        size="lg"
        variant={props.highlighted ? "default" : "outline"}
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
    <ConfirmDialog
      trigger={
        <Button variant="ghost" className="text-destructive">
          <Ban aria-hidden />
          Cancelar assinatura
        </Button>
      }
      title="Cancelar sua assinatura?"
      description="O cancelamento vale na hora e não haverá novas cobranças."
      confirmLabel="Cancelar assinatura"
      onConfirm={async () => {
        const result = await cancelMySubscriptionAction(props.subscriptionId);
        if (!result.ok) {
          toast.error(result.error);
          return false;
        }
        toast.success("Assinatura cancelada.");
        router.refresh();
      }}
    />
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
