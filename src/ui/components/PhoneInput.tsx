import type { InputHTMLAttributes } from 'react'
import {
  CLASSE_CONTROLE,
  FieldShell,
  describedBy,
  useFieldIds,
  type FieldShellProps,
} from './Field'
import { formatPhoneMask, phoneDigits } from './phone'

export interface PhoneInputProps
  extends
    FieldShellProps,
    Omit<
      InputHTMLAttributes<HTMLInputElement>,
      'className' | 'required' | 'value' | 'onChange' | 'type'
    > {
  /** Só dígitos nacionais (DDD + número), como o servidor espera. */
  value: string
  onChange: (digitos: string) => void
}

/** Telefone brasileiro com máscara; o valor do estado é sempre só dígitos (o código +55 é fixo na tela). */
export function PhoneInput({
  label,
  hint,
  error,
  required,
  className,
  id,
  value,
  onChange,
  ...resto
}: PhoneInputProps) {
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
      <div className="flex items-stretch gap-2">
        <span
          aria-hidden="true"
          className="flex min-h-11 items-center rounded-md border border-borda bg-elevada px-3 text-base text-suave"
        >
          +55
        </span>
        <input
          {...resto}
          id={ids.inputId}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(11) 90000-0000"
          required={required}
          value={formatPhoneMask(value)}
          onChange={(e) => onChange(phoneDigits(e.target.value))}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(ids, { hint, error })}
          className={CLASSE_CONTROLE}
        />
      </div>
    </FieldShell>
  )
}
