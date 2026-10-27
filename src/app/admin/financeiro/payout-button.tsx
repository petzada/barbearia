"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { closePayoutAction } from "@/app/actions/admin";
import { BottomSheet } from "@/components/kit/bottom-sheet";
import { Segmented } from "@/components/kit/segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPriceCents } from "@/lib/agenda/availability";
import { formatDateRange } from "@/lib/agenda/format";
import type { PayoutMethod } from "@/server/payouts";
import { useBusyTransition } from "@/components/loading/busy";

/** Fecha o período do barbeiro e marca as comissões como pagas. */
export function PayoutButton({
  barberId,
  barberName,
  amountCents,
  from,
  to,
}: {
  barberId: string;
  barberName: string;
  amountCents: number;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PayoutMethod>("pix");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useBusyTransition();

  function confirm() {
    startTransition(async () => {
      const result = await closePayoutAction({ barberId, from, to, method, note });
      if (!result.ok) return void toast.error(result.error);
      toast.success(`Repasse de ${formatPriceCents(result.data.amountCents)} registrado.`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Registrar repasse
      </Button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={`Repasse para ${barberName}`}
        description={formatDateRange(from, to)}
        footer={
          <Button size="lg" className="w-full" disabled={pending} onClick={confirm}>
            {pending ? "Registrando…" : "Registrar repasse"}
          </Button>
        }
      >
        <p className="text-display">{formatPriceCents(amountCents)}</p>
        <Segmented
          showLabel
          label="Forma de pagamento"
          value={method}
          onChange={setMethod}
          options={[
            { value: "pix", label: "Pix" },
            { value: "dinheiro", label: "Dinheiro" },
            { value: "transferencia", label: "Transferência" },
          ]}
        />
        <Input placeholder="Observação (opcional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} />
        <p className="text-xs text-ink-subtle">
          As comissões a pagar deste período ficam marcadas como pagas; o barbeiro vê o repasse em Ganhos.
        </p>
      </BottomSheet>
    </>
  );
}
