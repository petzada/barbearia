import { LoadingSkeleton } from '../components/states'

/** Enquanto a guarda da área lê a sessão (e no HTML do servidor, que não a conhece). */
export function AreaCarregando() {
  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <LoadingSkeleton lines={4} label="Carregando…" />
    </div>
  )
}
