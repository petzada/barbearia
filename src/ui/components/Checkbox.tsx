import type { InputHTMLAttributes, ReactNode } from 'react'
import { describedBy, useFieldIds } from './Field'
import { Icon } from './Icon'
import { cn } from './cn'

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'className'
> {
  label: ReactNode
  hint?: string
  error?: string
  className?: string
}

/** Caixa de seleção com área de toque de 44 px (o rótulo inteiro é clicável). */
export function Checkbox({ label, hint, error, className, id, ...resto }: CheckboxProps) {
  const ids = useFieldIds(id)
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label
        htmlFor={ids.inputId}
        className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-base text-texto"
      >
        <input
          {...resto}
          id={ids.inputId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(ids, { hint, error })}
          className="mt-0.5 size-6 shrink-0 accent-[var(--color-primaria)]"
        />
        <span>{label}</span>
      </label>
      {hint ? (
        <p id={ids.hintId} className="pl-9 text-sm text-suave">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={ids.errorId}
          role="alert"
          className="flex items-start gap-1.5 pl-9 text-sm text-perigo"
        >
          <Icon name="alerta" size={18} className="mt-0.5 shrink-0" />
          <span>
            <span className="font-semibold">Erro: </span>
            {error}
          </span>
        </p>
      ) : null}
    </div>
  )
}
