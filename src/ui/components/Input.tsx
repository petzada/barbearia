import type { InputHTMLAttributes } from 'react'
import {
  CLASSE_CONTROLE,
  FieldShell,
  describedBy,
  useFieldIds,
  type FieldShellProps,
} from './Field'
import { cn } from './cn'

export interface InputProps
  extends FieldShellProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'required'> {
  inputClassName?: string
}

export function Input({
  label,
  hint,
  error,
  required,
  className,
  inputClassName,
  id,
  ...resto
}: InputProps) {
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
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, { hint, error })}
        className={cn(CLASSE_CONTROLE, inputClassName)}
      />
    </FieldShell>
  )
}
