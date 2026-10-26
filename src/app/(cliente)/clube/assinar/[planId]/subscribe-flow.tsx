"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QrCode } from "lucide-react";
import { toast } from "sonner";
import { subscribeWithCardAction, subscribeWithPixAction } from "@/app/actions/cliente";
import { Segmented } from "@/components/kit/segmented";
import { Button } from "@/components/ui/button";
import { formatPriceCents } from "@/lib/agenda/availability";
import { BILLING_GRACE_DAYS } from "@/lib/club-billing";
import { CardCheckout, type CardCheckoutPayer } from "../../card-checkout";
import { PendingPayment } from "../../pending-payment";

type Method = "CARD" | "PIX";

const PAID_HREF = "/clube?assinatura=ok";

export function SubscribeFlow({
  plan,
  publicKey,
  payer,
}: {
  plan: { id: string; name: string; priceCents: number; cycleLabel: string };
  /** Sem chave pública configurada, só Pix. */
  publicKey: string | null;
  payer: CardCheckoutPayer;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>(publicKey ? "CARD" : "PIX");
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const price = formatPriceCents(plan.priceCents);
  const clearPending = useCallback(() => setPendingPaymentId(null), []);

  if (pendingPaymentId) {
    return <PendingPayment paymentId={pendingPaymentId} paidHref={PAID_HREF} onFailed={clearPending} />;
  }

  return (
    <div className="flex flex-col gap-5">
      {publicKey && (
        <Segmented
          showLabel
          label="Forma de pagamento"
          value={method}
          onChange={setMethod}
          options={[
            { value: "CARD", label: "Cartão" },
            { value: "PIX", label: "Pix" },
          ]}
        />
      )}

      {method === "CARD" && publicKey ? (
        <>
          <p className="text-sm text-ink-subtle">
            Cobramos {price} agora e, depois, automaticamente a cada renovação neste cartão.
          </p>
          <CardCheckout
            publicKey={publicKey}
            amountCents={plan.priceCents}
            payer={payer}
            submitLabel={`Assinar · ${price}/${plan.cycleLabel}`}
            onSubmit={async (input) => {
              const result = await subscribeWithCardAction({ planId: plan.id, ...input });
              if (!result.ok) {
                toast.error(result.error);
                return false;
              }
              if (result.data.status === "active") {
                router.replace(PAID_HREF);
                router.refresh();
              } else {
                setPendingPaymentId(result.data.paymentId);
              }
            }}
          />
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2 rounded-lg bg-card p-5 text-[15px] shadow-card">
            <li>Pague {price} agora com Pix e a assinatura é ativada na hora.</li>
            <li>
              Nas renovações, enviamos o Pix no seu WhatsApp 3 dias antes do vencimento. Sem pagamento, o acesso
              continua por mais {BILLING_GRACE_DAYS} dias.
            </li>
          </ul>
          <Button
            size="lg"
            className="w-full"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await subscribeWithPixAction(plan.id);
                if (!result.ok) return void toast.error(result.error);
                router.push(`/clube/pagar/${result.data.paymentId}`);
              })
            }
          >
            <QrCode aria-hidden />
            {pending ? "Gerando Pix…" : `Gerar Pix de ${price}`}
          </Button>
        </div>
      )}
    </div>
  );
}
