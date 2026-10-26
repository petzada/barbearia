"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { CardForm, cardErrorMessage, type CardFormHandle } from "@/components/club/card-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCpf, isValidCpf } from "@/lib/cpf";
import { formatPriceCents } from "@/lib/agenda/availability";
import { BILLING_GRACE_DAYS, MAX_CARD_ATTEMPTS } from "@/lib/club-billing";
import { cn } from "@/lib/utils";

export type CardCheckoutPayer = {
  name: string;
  cellphone: string;
  /** E-mail da conta (vazio quando o cadastro foi por telefone). */
  email: string | null;
  billingEmail: string | null;
  taxId: string | null;
};

export type CardCheckoutSubmit = { token: string; taxId: string; email?: string; consent: true };

/**
 * CPF + e-mail (se faltar) + cartão (iframe do AbacatePay) + autorização de
 * cobrança recorrente. Usado ao assinar e ao trocar o cartão.
 */
export function CardCheckout({
  publicKey,
  amountCents,
  payer,
  submitLabel,
  onSubmit,
}: {
  publicKey: string;
  amountCents: number;
  payer: CardCheckoutPayer;
  submitLabel: string;
  /** Devolve `false` para manter o formulário (erro já mostrado). */
  onSubmit: (input: CardCheckoutSubmit) => Promise<boolean | void>;
}) {
  const id = useId();
  const cardRef = useRef<CardFormHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [taxId, setTaxId] = useState(formatCpf(payer.taxId));
  const needsEmail = !payer.email;
  const [email, setEmail] = useState(payer.billingEmail ?? "");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const onReadyChange = useCallback((value: boolean) => setReady(value), []);

  const cpfOk = isValidCpf(taxId);
  const emailOk = !needsEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function submit() {
    setTouched(true);
    if (!cpfOk) return void toast.error("Informe um CPF válido.");
    if (!emailOk) return void toast.error("Informe um e-mail válido.");
    if (!consent) return void toast.error("Marque a autorização de cobrança no cartão.");
    if (!ready || !cardRef.current) return;
    setBusy(true);
    try {
      const card = await cardRef.current.tokenize({
        name: payer.name,
        email: needsEmail ? email.trim() : payer.email!,
        taxId: taxId.replace(/\D/g, ""),
        cellphone: payer.cellphone,
      });
      await onSubmit({
        token: card.token,
        taxId: taxId.replace(/\D/g, ""),
        ...(needsEmail ? { email: email.trim() } : {}),
        consent: true,
      });
    } catch (error) {
      toast.error(cardErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-cpf`}>CPF do titular</Label>
        <Input
          id={`${id}-cpf`}
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          value={taxId}
          aria-invalid={touched && !cpfOk ? true : undefined}
          onChange={(e) => setTaxId(formatCpf(e.target.value))}
        />
        <p className="text-xs text-ink-subtle">Exigido pelo AbacatePay para cobranças no cartão.</p>
      </div>

      {needsEmail && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-email`}>E-mail para comprovantes</Label>
          <Input
            id={`${id}-email`}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="voce@email.com"
            value={email}
            aria-invalid={touched && !emailOk ? true : undefined}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      )}

      <CardForm publicKey={publicKey} amountCents={amountCents} handleRef={cardRef} onReadyChange={onReadyChange} />

      <div
        className={cn(
          "flex items-start gap-3 rounded-lg bg-card p-4 shadow-card ring-2 transition",
          touched && !consent ? "ring-destructive/50" : consent ? "ring-cta" : "ring-transparent",
        )}
      >
        <input
          id={`${id}-consent`}
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 size-6 shrink-0 cursor-pointer accent-[var(--cta)]"
        />
        <label htmlFor={`${id}-consent`} className="flex cursor-pointer flex-col gap-1 text-[15px] leading-snug">
          <span className="font-semibold">
            Autorizo a cobrança automática de {formatPriceCents(amountCents)} neste cartão a cada renovação, até eu cancelar.
          </span>
          <span className="text-xs text-ink-subtle">
            Se a cobrança for recusada, tentamos de novo a cada 24 h (até {MAX_CARD_ATTEMPTS} vezes) e seu acesso continua por{" "}
            {BILLING_GRACE_DAYS} dias. Cancelando, o acesso vale até o fim do período pago. Veja os{" "}
            <a href="/termos#cobranca" target="_blank" rel="noreferrer" className="text-cta-ink underline underline-offset-2">
              Termos
            </a>
            .
          </span>
        </label>
      </div>

      <Button size="lg" className="w-full" disabled={busy || !ready} onClick={submit}>
        <Lock aria-hidden />
        {busy ? "Processando…" : submitLabel}
      </Button>
    </div>
  );
}
