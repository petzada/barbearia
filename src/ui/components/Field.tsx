import { useId, type ReactNode } from 'react'
import { cn } from './cn'
import { Icon } from './Icon'

export interface FieldIds {
  inputId: string
  hintId: string
  errorId: string
}

export interface FieldShellProps {
  label: string
  hint?: string
  /** Mensagem segura vinda da validação (do servidor, `fields[].message`). */
  error?: string
  /** Rótulo visível é sempre exigido; `required` só marca o campo. */
  required?: boolean
  className?: string
}

export function useFieldIds(idExterno?: string): FieldIds {
  const gerado = useId()
  const base = idExterno ?? gerado
  return { inputId: base, hintId: `${base}-dica`, errorId: `${base}-erro` }
}

/** `aria-describedby` do controle: dica e erro quando existirem. */
export function describedBy(ids: FieldIds, { hint, error }: { hint?: string; error?: string }) {
  const partes = [hint ? ids.hintId : null, error ? ids.errorId : null].filter(Boolean)
  return partes.length ? partes.join(' ') : undefined
}

/**
 * Casca comum dos campos: rótulo, dica e erro. O erro tem ícone e o prefixo "Erro:" para não depender
 * só de cor (PRD §4.1) e é anunciado por leitor de tela (role="alert").
 */
export function FieldShell({
  ids,
  label,
  hint,
  error,
  required,
  className,
  children,
}: FieldShellProps & { ids: FieldIds; children: ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={ids.inputId} className="text-sm font-semibold text-texto">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-primaria">
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint ? (
        <p id={ids.hintId} className="text-sm text-suave">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={ids.errorId} role="alert" className="flex items-start gap-1.5 text-sm text-perigo">
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

export const CLASSE_CONTROLE =
  'min-h-11 w-full rounded-md border bg-superficie px-3 py-2 text-base text-texto placeholder:text-suave ' +
  'border-borda-forte disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-perigo aria-[invalid=true]:border-2'
