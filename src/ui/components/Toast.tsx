import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ICONE_DO_TOM, type Tone } from './Badge'
import { Icon } from './Icon'

export interface ToastInput {
  tone?: Tone
  title: string
  description?: string
}

interface ToastItem extends ToastInput {
  id: number
  tone: Tone
}

interface ToastApi {
  show: (toast: ToastInput) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const DURACAO_MS = 7000

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast exige <ToastProvider> acima na árvore.')
  return api
}

/**
 * Avisos transitórios. As duas regiões ficam sempre montadas (leitor de tela só anuncia mudança em
 * região já existente): `status` (polite) para informação e `alert` (assertive) para erro (PRD §4.1).
 * Toast confirma o que o servidor já registrou; nunca é a única prova de que algo aconteceu.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ToastItem[]>([])
  const proximoId = useRef(1)

  const remover = useCallback((id: number) => {
    setItens((atual) => atual.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((toast: ToastInput) => {
    const id = proximoId.current++
    setItens((atual) => [...atual.slice(-3), { ...toast, id, tone: toast.tone ?? 'info' }])
  }, [])

  const api = useMemo(() => ({ show }), [show])
  const comuns = itens.filter((t) => t.tone !== 'perigo')
  const erros = itens.filter((t) => t.tone === 'perigo')

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 mx-auto flex w-full max-w-md flex-col gap-2 px-4 lg:bottom-6">
        <div role="status" aria-live="polite" className="flex flex-col gap-2">
          {comuns.map((t) => (
            <ToastCard key={t.id} item={t} onClose={remover} />
          ))}
        </div>
        <div role="alert" aria-live="assertive" className="flex flex-col gap-2">
          {erros.map((t) => (
            <ToastCard key={t.id} item={t} onClose={remover} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: (id: number) => void }) {
  useEffect(() => {
    // Erro fica até ser dispensado: some sozinho antes de a pessoa ler seria perder a informação.
    if (item.tone === 'perigo') return
    const t = setTimeout(() => onClose(item.id), DURACAO_MS)
    return () => clearTimeout(t)
  }, [item.id, item.tone, onClose])

  return (
    <div
      data-tom={item.tone}
      className="pointer-events-auto flex items-start gap-3 rounded-md border border-[color-mix(in_oklab,var(--tom)_60%,transparent)] bg-elevada p-3 shadow-card"
    >
      <span className="mt-0.5 text-[var(--tom)]">
        <Icon name={ICONE_DO_TOM[item.tone]} size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-texto">{item.title}</p>
        {item.description ? <p className="text-sm text-suave">{item.description}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => onClose(item.id)}
        aria-label="Fechar aviso"
        className="grid size-11 shrink-0 place-items-center rounded-md text-suave hover:bg-superficie"
      >
        <Icon name="fechar" size={20} />
      </button>
    </div>
  )
}
