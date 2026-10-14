import { useRef, useState, type ButtonHTMLAttributes, type MouseEvent } from 'react'
import { cn } from './cn'
import { Icon } from './Icon'

export type ButtonVariant = 'primario' | 'secundario' | 'perigo' | 'fantasma'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  variant?: ButtonVariant
  /** Estado "enviando" controlado pela tela (ex.: `mutation.isSending`). */
  sending?: boolean
  /** Texto enquanto envia; o padrão é "Enviando…". */
  sendingLabel?: string
  fullWidth?: boolean
  /**
   * Se devolver uma Promise, o botão fica bloqueado até ela terminar: duplo clique não dispara duas
   * vezes (PRD §4.1, estado "enviando").
   */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void | Promise<unknown>
}

const VARIANTES: Record<ButtonVariant, string> = {
  primario:
    'bg-primaria text-sobre-primaria border-transparent hover:brightness-110 active:brightness-95',
  secundario: 'bg-elevada text-texto border-borda-forte hover:bg-superficie active:brightness-95',
  perigo:
    'bg-transparent text-perigo border-perigo hover:bg-[color-mix(in_oklab,var(--color-perigo)_14%,transparent)]',
  fantasma: 'bg-transparent text-texto border-transparent hover:bg-elevada',
}

export function Button({
  variant = 'primario',
  sending = false,
  sendingLabel = 'Enviando…',
  fullWidth = false,
  onClick,
  type = 'button',
  className,
  children,
  disabled,
  ...resto
}: ButtonProps) {
  const emVoo = useRef(false)
  const [aguardando, setAguardando] = useState(false)
  const bloqueado = sending || aguardando

  function tratarClique(event: MouseEvent<HTMLButtonElement>) {
    // aria-disabled não impede o clique nem o Enter de um formulário: o bloqueio real é aqui.
    if (bloqueado || emVoo.current) {
      event.preventDefault()
      return
    }
    const retorno = onClick?.(event)
    if (retorno && typeof (retorno as Promise<unknown>).then === 'function') {
      emVoo.current = true
      setAguardando(true)
      const liberar = () => {
        emVoo.current = false
        setAguardando(false)
      }
      ;(retorno as Promise<unknown>).then(liberar, liberar)
    }
  }

  return (
    <button
      {...resto}
      type={type}
      disabled={disabled}
      aria-disabled={bloqueado || undefined}
      aria-busy={bloqueado || undefined}
      onClick={tratarClique}
      className={cn(
        'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md border px-4 py-2 text-base font-semibold transition select-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        bloqueado && 'cursor-progress opacity-80',
        fullWidth && 'w-full',
        VARIANTES[variant],
        className,
      )}
    >
      {bloqueado ? (
        <>
          <Icon name="girar" size={18} className="animate-[ui-girar_0.9s_linear_infinite]" />
          <span>{sendingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
