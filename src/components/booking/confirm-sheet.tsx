"use client";

import { Banknote, QrCode } from "lucide-react";
import { formatMinutesShort, formatPriceCents, formatSlotTime } from "@/lib/agenda/availability";
import { formatDayLabel } from "@/lib/agenda/format";
import { PAY_AT_SHOP_LABEL } from "@/lib/payments";
import { BottomSheet } from "@/components/kit/bottom-sheet";
import { OptionCard, OptionGroup } from "@/components/kit/option-card";
import { Button } from "@/components/ui/button";
import { BarberAvatar } from "./barber-avatar";
import type { BookingBarber, BookingRules, BookingService } from "./types";

export type PaymentChoice = "pix" | "local";

/** Etapa 4: folha inferior com resumo, forma de pagamento e confirmação. */
export function ConfirmSheet({
  open,
  onOpenChange,
  barber,
  service,
  slot,
  rules,
  payment,
  pending,
  onPaymentChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barber: BookingBarber;
  service: BookingService;
  slot: number | null;
  rules: BookingRules;
  payment: PaymentChoice;
  pending: boolean;
  onPaymentChange: (choice: PaymentChoice) => void;
  onConfirm: () => void;
}) {
  const options = [
    ...(rules.onlinePayment
      ? [{ value: "pix" as const, title: "Pix agora", description: "QR Code na hora, confirmação automática.", icon: QrCode }]
      : []),
    { value: "local" as const, title: PAY_AT_SHOP_LABEL, description: "Dinheiro, cartão ou Pix no balcão.", icon: Banknote },
  ];

  return (
    <BottomSheet
      open={open && slot != null}
      onOpenChange={onOpenChange}
      title="Confirme seu horário"
      description="Confira os detalhes antes de confirmar."
      footer={
        <Button size="lg" className="w-full" onClick={onConfirm} disabled={pending || slot == null}>
          {pending ? "Confirmando…" : `Confirmar · ${formatPriceCents(service.priceCents)}`}
        </Button>
      }
    >
      {slot != null && (
        <>
          <div className="flex flex-col gap-4 rounded-lg bg-card p-5 shadow-card">
            <div className="flex items-center gap-3">
              <BarberAvatar name={barber.name} image={barber.image} size="sm" />
              <div className="min-w-0">
                <p className="font-bold">{service.name}</p>
                <p className="text-sm text-ink-subtle">com {barber.name}</p>
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-3 border-t border-hairline pt-4 text-sm">
              <div>
                <dt className="text-ink-subtle">Data</dt>
                <dd className="font-bold">{formatDayLabel(slot)}</dd>
              </div>
              <div>
                <dt className="text-ink-subtle">Horário</dt>
                <dd className="tabular font-bold">{formatSlotTime(slot)}</dd>
              </div>
              <div>
                <dt className="text-ink-subtle">Duração</dt>
                <dd className="font-bold">{service.durationMinutes} min</dd>
              </div>
            </dl>
            <div className="flex items-center justify-between border-t border-hairline pt-4">
              <span className="text-sm text-ink-subtle">Total</span>
              <span className="tabular text-xl font-extrabold">{formatPriceCents(service.priceCents)}</span>
            </div>
          </div>

          <OptionGroup label="Como você prefere pagar?">
            {options.map((opt) => (
              <OptionCard
                key={opt.value}
                selected={payment === opt.value}
                onSelect={() => onPaymentChange(opt.value)}
                title={opt.title}
                description={opt.description}
                icon={opt.icon}
              />
            ))}
          </OptionGroup>

          <p className="text-xs text-ink-subtle">
            Cancele grátis pelo app até {formatMinutesShort(rules.cancelUntilMinutes)} antes do horário.
          </p>
        </>
      )}
    </BottomSheet>
  );
}
