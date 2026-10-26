"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { cancelMySubscriptionAction } from "@/app/actions/cliente";
import { Button } from "@/components/ui/button";
import { Ban } from "lucide-react";
import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { formatDayLong } from "@/lib/agenda/format";

/** Cancelar renovações: o acesso continua até o fim do período pago. */
export function CancelSubscriptionButton({
  subscriptionId,
  accessUntil,
}: {
  subscriptionId: string;
  /** `null` = pagamento pendente: encerra na hora. */
  accessUntil: number | null;
}) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" className="text-destructive">
          <Ban aria-hidden />
          Cancelar assinatura
        </Button>
      }
      title="Cancelar sua assinatura?"
      description={
        accessUntil
          ? `Não haverá novas cobranças. Você continua com os benefícios do clube até ${formatDayLong(accessUntil)}.`
          : "A renovação não foi paga, então o cancelamento vale na hora e não haverá novas cobranças."
      }
      confirmLabel="Cancelar assinatura"
      cancelLabel="Manter"
      onConfirm={async () => {
        const result = await cancelMySubscriptionAction(subscriptionId);
        if (!result.ok) {
          toast.error(result.error);
          return false;
        }
        toast.success(
          accessUntil
            ? `Assinatura cancelada. Seus benefícios valem até ${formatDayLong(result.data.endsAt)}.`
            : "Assinatura cancelada.",
        );
        router.refresh();
      }}
    />
  );
}

const RETURN_MESSAGES: Record<string, string> = {
  "assinatura=ok": "Pagamento aprovado! Bem-vindo ao Clube Moura.",
  "cartao=ok": "Cartão atualizado e renovação paga.",
};

/** Retorno da adesão/troca de cartão (`/clube?assinatura=ok`, `/clube?cartao=ok`). */
export function SubscriptionReturnToast() {
  const params = useSearchParams();
  const router = useRouter();
  const key = params.get("assinatura") === "ok" ? "assinatura=ok" : params.get("cartao") === "ok" ? "cartao=ok" : null;
  useEffect(() => {
    if (!key) return;
    toast.success(RETURN_MESSAGES[key]);
    const id = setTimeout(() => router.replace("/clube"), 4000);
    return () => clearTimeout(id);
  }, [key, router]);
  return null;
}
