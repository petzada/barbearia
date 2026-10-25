"use client";

/** "Não chegou? Reenviar código" — mesmo bloco no login e no cadastro. */
export function ResendCode({
  seconds,
  label,
  disabled,
  onResend,
}: {
  seconds: number;
  label: string;
  disabled?: boolean;
  onResend: () => void;
}) {
  return (
    <p className="flex min-h-11 flex-wrap items-center gap-x-1 text-sm text-ink-subtle">
      Não chegou?
      {seconds > 0 ? (
        <span className="tabular font-semibold">Reenviar em {label}</span>
      ) : (
        <button
          type="button"
          className="inline-flex min-h-11 items-center font-bold text-cta-ink disabled:opacity-50"
          disabled={disabled}
          onClick={onResend}
        >
          Reenviar código
        </button>
      )}
    </p>
  );
}
