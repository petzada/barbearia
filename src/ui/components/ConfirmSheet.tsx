import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'

interface ConfirmSheetProps {
  open: boolean
  title: string
  /**
   * Consequência em linguagem simples (PRD §4.1): o que a ação consome, cobra, cancela ou altera. O texto
   * vem pronto do servidor/domínio; a folha só o exibe e nunca o calcula.
   */
  consequences: readonly ReactNode[]
  confirmLabel: string
  cancelLabel?: string
  tone?: 'normal' | 'perigo'
  /** Se devolver Promise, os botões ficam bloqueados até terminar (sem duplo envio). */
  onConfirm: () => void | Promise<unknown>
  onCancel: () => void
  /** Entra no lugar das consequências quando a ação não tem efeito a avisar (uso raro). */
  children?: ReactNode
}

/**
 * Confirmação explícita antes de ação com consequência. Usa <dialog> nativo (`showModal`): foco preso,
 * Esc fecha, o fundo fica inerte e o leitor de tela entende como diálogo modal.
 */
export function ConfirmSheet({
  open,
  title,
  consequences,
  confirmLabel,
  cancelLabel = 'Voltar',
  tone = 'normal',
  onConfirm,
  onCancel,
  children,
}: ConfirmSheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const tituloId = useId()
  const descricaoId = useId()

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (open && !dialogo.open) dialogo.showModal()
    if (!open && dialogo.open) dialogo.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="ui-folha"
      aria-labelledby={tituloId}
      aria-describedby={descricaoId}
      onCancel={(e) => {
        // Esc: deixa a tela controlar o estado (open) em vez de fechar o <dialog> por conta própria.
        e.preventDefault()
        onCancel()
      }}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <span className={tone === 'perigo' ? 'text-perigo' : 'text-primaria'}>
            <Icon name={tone === 'perigo' ? 'alerta' : 'info'} size={28} />
          </span>
          <h2 id={tituloId} className="text-xl font-semibold text-texto">
            {title}
          </h2>
        </div>
        <div id={descricaoId} className="flex flex-col gap-2">
          {consequences.length > 0 ? (
            <>
              <p className="text-sm font-semibold text-suave">O que vai acontecer</p>
              <ul className="list-disc pl-5 text-texto">
                {consequences.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </>
          ) : null}
          {children}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secundario" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'perigo' ? 'perigo' : 'primario'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
