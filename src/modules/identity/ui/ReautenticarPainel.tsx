import { useState, type FormEvent } from 'react'
import { chamarAuth, type ErroDeApi } from './api'

/**
 * D0071: pede a autenticação recente (novo código no WhatsApp ou Google) e devolve a pessoa para a ação que a pediu
 * (`aoConfirmar` repete a ação). Aparece quando uma operação responde `AUTH.RECENT_REQUIRED`.
 */
export function ReautenticarPainel({
  googleVinculado,
  voltar,
  aoConfirmar,
}: {
  googleVinculado: boolean
  /** Caminho para onde o Google deve devolver a pessoa. */
  voltar: string
  aoConfirmar: () => void
}) {
  const [enviado, setEnviado] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<ErroDeApi | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function enviar() {
    setOcupado(true)
    setErro(null)
    const r = await chamarAuth('/identity/reauth/send', {})
    setOcupado(false)
    if (!r.ok) return setErro(r.erro)
    setEnviado(true)
  }

  async function confirmar(e: FormEvent) {
    e.preventDefault()
    setOcupado(true)
    setErro(null)
    const r = await chamarAuth('/identity/reauth/confirm', { codigo })
    setOcupado(false)
    if (!r.ok) return setErro(r.erro)
    aoConfirmar()
  }

  async function comGoogle() {
    const r = await chamarAuth<{ url?: string }>('/sign-in/social', {
      provider: 'google',
      callbackURL: voltar,
      errorCallbackURL: voltar,
    })
    if (r.ok && r.dados.url) window.location.assign(r.dados.url)
    else if (!r.ok) setErro(r.erro)
  }

  return (
    <section role="dialog" aria-label="Confirme sua identidade" data-testid="reautenticar" className="flex flex-col gap-3 rounded border border-destaque p-4">
      <h2 className="font-semibold">Confirme sua identidade</h2>
      <p className="text-sm">Esta ação é sensível. Confirme que é você para continuar.</p>
      {erro ? (
        <p role="alert" data-testid="erro-reauth" className="text-sm text-red-300">
          {erro.message}
        </p>
      ) : null}
      {!enviado ? (
        <button data-testid="reauth-enviar" onClick={() => void enviar()} disabled={ocupado} className="rounded bg-destaque p-3 font-semibold text-black disabled:opacity-60">
          Receber código no WhatsApp
        </button>
      ) : (
        <form onSubmit={confirmar} className="flex flex-col gap-2">
          <input
            data-testid="reauth-codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
            className="rounded border border-white/30 bg-transparent p-3 text-center text-xl tracking-widest"
            aria-label="Código de 6 dígitos"
          />
          <button data-testid="reauth-confirmar" disabled={ocupado || codigo.length !== 6} className="rounded bg-destaque p-3 font-semibold text-black disabled:opacity-60">
            Confirmar
          </button>
        </form>
      )}
      {googleVinculado ? (
        <button type="button" onClick={() => void comGoogle()} className="rounded border border-white/40 p-3 text-sm">
          Confirmar com Google
        </button>
      ) : null}
    </section>
  )
}
