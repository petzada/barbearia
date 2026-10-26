"use client";

import { Input } from "@/components/ui/input";

const format = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

/** Campo de valor em reais com máscara (digita só números: 4500 → R$ 45,00). */
export function MoneyInput({
  id,
  valueCents,
  onChange,
  ariaLabel,
}: {
  id?: string;
  valueCents: number;
  onChange: (cents: number) => void;
  ariaLabel?: string;
}) {
  return (
    <Input
      id={id}
      inputMode="numeric"
      enterKeyHint="done"
      autoComplete="off"
      aria-label={ariaLabel}
      value={format(valueCents)}
      onChange={(e) => {
        const cents = Number(e.target.value.replace(/\D/g, "").slice(0, 9) || "0");
        // Evita re-render quando nada mudou (ex.: apagar o "R$").
        if (cents !== valueCents) onChange(cents);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      className="tabular text-lg font-bold"
    />
  );
}
