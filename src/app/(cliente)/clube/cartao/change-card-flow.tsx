"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { changeCardAction } from "@/app/actions/cliente";
import { formatPriceCents } from "@/lib/agenda/availability";
import { CardCheckout, type CardCheckoutPayer } from "../card-checkout";
import { PendingPayment } from "../pending-payment";

const PAID_HREF = "/clube?cartao=ok";

export function ChangeCardFlow({
  publicKey,
  amountCents,
  payer,
}: {
  publicKey: string;
  amountCents: number;
  payer: CardCheckoutPayer;
}) {
  const router = useRouter();
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const clearPending = useCallback(() => setPendingPaymentId(null), []);

  if (pendingPaymentId) {
    return <PendingPayment paymentId={pendingPaymentId} paidHref={PAID_HREF} onFailed={clearPending} />;
  }

  return (
    <CardCheckout
      publicKey={publicKey}
      amountCents={amountCents}
      payer={payer}
      submitLabel={`Pagar ${formatPriceCents(amountCents)} e usar este cartão`}
      onSubmit={async (input) => {
        const result = await changeCardAction(input);
        if (!result.ok) {
          toast.error(result.error);
          return false;
        }
        if (result.data.status === "paid") {
          router.replace(PAID_HREF);
          router.refresh();
        } else {
          setPendingPaymentId(result.data.paymentId);
        }
      }}
    />
  );
}
