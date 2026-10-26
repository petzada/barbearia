"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Caixa de aceite dos Termos e da Política (sempre começa desmarcada).
 * Os links abrem em nova aba para não perder o cadastro em andamento.
 */
export function TermsConsent({
  checked,
  onCheckedChange,
  invalid,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  invalid?: boolean;
}) {
  const id = useId();
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg bg-card p-4 shadow-card ring-2 transition",
        invalid && !checked ? "ring-destructive/50" : checked ? "ring-cta" : "ring-transparent",
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="mt-0.5 size-6 shrink-0 cursor-pointer accent-[var(--cta)]"
        aria-describedby={`${id}-hint`}
      />
      <label htmlFor={id} className="flex cursor-pointer flex-col gap-1 text-[15px] leading-snug">
        <span className="font-semibold">
          Li e aceito os{" "}
          <a href="/termos" target="_blank" rel="noreferrer" className="text-cta-ink underline underline-offset-2">
            Termos de Uso
          </a>{" "}
          e a{" "}
          <a href="/privacidade" target="_blank" rel="noreferrer" className="text-cta-ink underline underline-offset-2">
            Política de Privacidade
          </a>
        </span>
        <span id={`${id}-hint`} className="text-xs text-ink-subtle">
          Inclui as regras de agendamento, cancelamento, faltas e do Clube Moura.
        </span>
      </label>
    </div>
  );
}
