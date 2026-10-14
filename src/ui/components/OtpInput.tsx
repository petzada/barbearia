import type { InputHTMLAttributes } from 'react'
import {
  CLASSE_CONTROLE,
  FieldShell,
  describedBy,
  useFieldIds,
  type FieldShellProps,
} from './Field'
import { cn } from './cn'

export interface OtpInputProps
  extends
    FieldShellProps,
    Omit<
      InputHTMLAttributes<HTMLInputElement>,
      'className' | 'required' | 'value' | 'onChange' | 'type' | 'maxLength'
    > {
  value: string
  onChange: (codigo: string) => void
  /** Quantidade de dígitos do código (6 no MVP, D0017). */
  length?: number
}

/**
 * Código de uso único. É um único campo (colar e preenchimento automático do SMS/WhatsApp funcionam e o
 * leitor de tela lê um campo só); o espaçamento entre dígitos é só visual.
 */
export function OtpInput({
  label,
  hint,
  error,
  required,
  className,
  id,
  value,
  onChange,
  length = 6,
  ...resto
}: OtpInputProps) {
  const ids = useFieldIds(id)
  return (
    <FieldShell
      ids={ids}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <input
        {...resto}
        id={ids.inputId}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern={`[0-9]{${length}}`}
        maxLength={length}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, length))}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, { hint, error })}
        className={cn(
          CLASSE_CONTROLE,
          'text-center text-2xl font-semibold tracking-[0.5em] tabular-nums',
        )}
      />
    </FieldShell>
  )
}
