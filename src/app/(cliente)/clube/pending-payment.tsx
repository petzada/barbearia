"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { checkPixAction } from "@/app/actions/cliente";

const POLL_MS = 4000;

/** Cobrança no cartão em análise: consulta até confirmar (ou recusar). */
export function PendingPayment({
  paymentId,
  paidHref,
  onFailed,
}: {
  paymentId: string;
  paidHref: string;
  onFailed: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    if (status !== "pending") return;
    const poll = setInterval(async () => {
      const result = await checkPixAction(paymentId);
      if (result.ok && result.data.status !== "pending") setStatus(result.data.status);
    }, POLL_MS);
    return () => clearInterval(poll);
  }, [paymentId, status]);

  useEffect(() => {
    if (status === "paid") {
      router.replace(paidHref);
      router.refresh();
    } else if (status !== "pending") {
      toast.error("O pagamento não foi aprovado. Confira os dados ou use outro cartão.");
      onFailed();
    }
  }, [status, paidHref, router, onFailed]);

  return (
    <p
      className="flex items-center justify-center gap-2 rounded-lg bg-card p-5 text-sm font-semibold text-ink-muted shadow-card"
      aria-live="polite"
    >
      <LoaderCircle className="size-4 animate-spin" aria-hidden />
      Confirmando o pagamento com a operadora… pode levar alguns minutos.
    </p>
  );
}
