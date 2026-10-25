"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const LENGTH = 6;

/**
 * Código de 6 dígitos em caixas separadas: avança sozinho, aceita colar e o
 * preenchimento automático do teclado (one-time-code) e chama `onComplete`
 * quando o 6º dígito entra.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = false,
  invalid = false,
}: {
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  invalid?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus) refs.current[Math.min(value.length, LENGTH - 1)]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- foco só na montagem
  }, [autoFocus]);

  function commit(next: string, focusIndex: number) {
    const clean = next.replace(/\D/g, "").slice(0, LENGTH);
    onChange(clean);
    refs.current[Math.min(focusIndex, LENGTH - 1)]?.focus();
    if (clean.length === LENGTH) onComplete?.(clean);
  }

  function handleChange(index: number, raw: string) {
    const typed = raw.replace(/\D/g, "");
    if (!typed) return;
    if (typed.length > 1) {
      // Colar ou autopreenchimento: distribui a partir da caixa atual.
      const merged = (value.slice(0, index) + typed).slice(0, LENGTH);
      commit(merged, merged.length);
      return;
    }
    const chars = digits.slice();
    chars[index] = typed;
    const next = chars.join("").slice(0, LENGTH);
    commit(next, index + 1);
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();
      const chars = digits.slice();
      if (chars[index]) {
        chars[index] = "";
        onChange(chars.join("").replace(/\s/g, ""));
        return;
      }
      if (index > 0) {
        chars[index - 1] = "";
        onChange(chars.join(""));
        refs.current[index - 1]?.focus();
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="Código de 6 números">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Dígito ${i + 1}`}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          value={digit}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => {
            e.preventDefault();
            handleChange(i, e.clipboardData.getData("text"));
          }}
          className={cn(
            "tabular h-14 w-full min-w-0 rounded-md border bg-card text-center text-2xl font-extrabold outline-none transition focus:border-cta focus:ring-2 focus:ring-cta/30 disabled:opacity-60",
            invalid ? "border-destructive" : digit ? "border-cta/50" : "border-hairline-strong",
          )}
        />
      ))}
    </div>
  );
}
