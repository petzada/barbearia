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
      aria-label={ariaLabel}
      value={format(valueCents)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
        onChange(Number(digits || "0"));
      }}
      className="tabular text-lg font-bold"
    />
  );
}
