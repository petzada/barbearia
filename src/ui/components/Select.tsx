import type { SelectHTMLAttributes } from 'react'
import {
  CLASSE_CONTROLE,
  FieldShell,
  describedBy,
  useFieldIds,
  type FieldShellProps,
} from './Field'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps
  extends
    FieldShellProps,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'required' | 'children'> {
  options: readonly SelectOption[]
  /** Opção inicial sem valor (ex.: "Escolha uma opção"). */
  placeholder?: string
}

/** Seleção nativa estilizada: teclado, leitor de tela e seletor do sistema funcionam sem código extra. */
export function Select({
  label,
  hint,
  error,
  required,
  className,
  id,
  options,
  placeholder,
  ...resto
}: SelectProps) {
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
      <select
        {...resto}
        id={ids.inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, { hint, error })}
        className={CLASSE_CONTROLE}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}
