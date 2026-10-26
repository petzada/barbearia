"use client";

import { Banknote, Crown, QrCode } from "lucide-react";
import { formatMinutesShort, formatPriceCents, formatSlotTime } from "@/lib/agenda/availability";
import { formatDayLabel } from "@/lib/agenda/format";
import { PAY_AT_SHOP_LABEL } from "@/lib/payments";
import { BottomSheet } from "@/components/kit/bottom-sheet";
import { OptionCard, OptionGroup } from "@/components/kit/option-card";
import { Button } from "@/components/ui/button";
import { clubCoversService, clubCoversSlot, clubWeekdayHint } from "@/lib/club";
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
  const covered = slot != null && clubCoversSlot(rules.club, service.id, slot);
  // Serviço do plano, mas fora dos dias cobertos (ex.: Gold Limitado numa segunda).
  const weekdayHint =
    slot != null && !covered && clubCoversService(rules.club, service.id) ? clubWeekdayHint(rules.club) : null;
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
          {pending ? "Confirmando…" : covered ? "Confirmar · Incluso no plano" : `Confirmar · ${formatPriceCents(service.priceCents)}`}
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
              {covered ? (
                <span className="flex items-baseline gap-2">
                  <span className="tabular text-sm text-ink-subtle line-through">{formatPriceCents(service.priceCents)}</span>
                  <span className="tabular text-xl font-extrabold">R$ 0,00 hoje</span>
                </span>
              ) : (
                <span className="tabular text-xl font-extrabold">{formatPriceCents(service.priceCents)}</span>
              )}
            </div>
          </div>

          {covered && rules.club && (
            <p className="flex items-start gap-2 rounded-md bg-teal-soft px-3 py-2 text-sm font-semibold text-cta-ink">
              <Crown className="mt-0.5 size-4 shrink-0" aria-hidden />
              Incluso no seu plano {rules.club.planName} · restam {rules.club.remaining} de {rules.club.total} neste ciclo
            </p>
          )}
          {weekdayHint && (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-ink-muted">
              {weekdayHint}. Neste dia o serviço é cobrado normalmente.
            </p>
          )}

          {!covered && (
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
          )}

          <p className="text-xs text-ink-subtle">
            Cancele grátis pelo app até {formatMinutesShort(rules.cancelUntilMinutes)} antes do horário.
          </p>
        </>
      )}
    </BottomSheet>
  );
}
