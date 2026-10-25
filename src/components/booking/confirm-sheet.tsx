"use client";

import { Banknote, QrCode } from "lucide-react";
import {
  dateKeyFromIsoInSP,
  formatMinutesShort,
  formatPriceCents,
  formatSelectableDay,
  formatSlotTime,
} from "@/lib/agenda/availability";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
    { value: "local" as const, title: "Pagar na barbearia", description: "Dinheiro, cartão ou Pix no balcão.", icon: Banknote },
  ];

  return (
    <Sheet open={open && slot != null} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-[28px] border-0 bg-background p-0 sm:mx-auto sm:max-w-lg"
      >
        {slot != null && (
          <div className="flex flex-col gap-5 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-6">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-hairline-strong" aria-hidden />
            <div>
              <SheetTitle className="text-xl font-extrabold">Confirme seu horário</SheetTitle>
              <SheetDescription className="text-sm text-ink-subtle">Confira os detalhes antes de confirmar.</SheetDescription>
            </div>

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
                  <dd className="font-bold capitalize">{formatSelectableDay(dateKeyFromIsoInSP(slot))}</dd>
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

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-bold">Como você prefere pagar?</legend>
              {options.map((opt) => {
                const Icon = opt.icon;
                const selected = payment === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex cursor-pointer items-center gap-4 rounded-lg bg-card p-4 shadow-card ring-2 transition",
                      selected ? "ring-cta" : "ring-transparent",
                    )}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={opt.value}
                      checked={selected}
                      onChange={() => onPaymentChange(opt.value)}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-md",
                        selected ? "bg-cta text-cta-foreground" : "bg-muted text-ink-subtle",
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="flex flex-col">
                      <span className="font-bold">{opt.title}</span>
                      <span className="text-sm text-ink-subtle">{opt.description}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>

            <p className="text-xs text-ink-subtle">
              Cancele grátis pelo app até {formatMinutesShort(rules.cancelUntilMinutes)} antes do horário.
            </p>

            <Button size="lg" className="w-full" onClick={onConfirm} disabled={pending}>
              {pending ? "Confirmando…" : `Confirmar · ${formatPriceCents(service.priceCents)}`}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
