import { useEffect, useState, type FormEvent } from 'react'
import { meRemoto } from '../client'
import { chamarAuth, formatarEspera, type ErroDeApi } from './api'
import { ReautenticarPainel } from './ReautenticarPainel'

// A02: trocar o WhatsApp (logado). Código no número NOVO; colisão com outra conta orienta o suporte. Também abriga
// "Entrar com Google" (vincular exige login recente, RN01). O T05 aplica o visual do Perfil.

type Etapa = 'carregando' | 'numero' | 'codigo' | 'pronto'

export function TrocarNumeroForm() {
  const caminho = '/app/perfil/numero'
  const [etapa, setEtapa] = useState<Etapa>('carregando')
  const [atual, setAtual] = useState<string | null>(null)
  const [google, setGoogle] = useState(false)
  const [novo, setNovo] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<ErroDeApi | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [reautenticar, setReautenticar] = useState(false)

  useEffect(() => {
    void meRemoto({}).then((r) => {
      if (r.status === 'ok') {
        setAtual(r.data.telefoneMascarado)
        setGoogle(r.data.google)
        setEtapa('numero')
      } else {
        window.location.assign(`/entrar?voltar=${encodeURIComponent(caminho)}`)
      }
    })
  }, [])

  async function enviar(e?: FormEvent) {
    e?.preventDefault()
    setOcupado(true)
    setErro(null)
    const r = await chamarAuth('/identity/phone-change/send', { telefone: novo })
    setOcupado(false)
    if (!r.ok) return setErro(r.erro)
    setCodigo('')
    setEtapa('codigo')
  }

  async function confirmar(e: FormEvent) {
    e.preventDefault()
    setOcupado(true)
    setErro(null)
    const r = await chamarAuth<{ telefone: string }>('/identity/phone-change/confirm', { telefone: novo, codigo })
    setOcupado(false)
    if (!r.ok) return setErro(r.erro)
    setAtual(r.dados.telefone)
    setEtapa('pronto')
  }

  async function vincularGoogle() {
    setErro(null)
    const r = await chamarAuth<{ url?: string }>('/link-social', { provider: 'google', callbackURL: caminho })
    if (!r.ok) {
      if (r.erro.code === 'AUTH.RECENT_REQUIRED') return setReautenticar(true)
      return setErro(r.erro)
    }
    if (r.dados.url) window.location.assign(r.dados.url)
  }

  if (etapa === 'carregando') return <p className="p-6">Carregando…</p>

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 p-6" data-testid="trocar-numero">
      <header>
        <h1 className="text-2xl font-bold text-destaque">Trocar WhatsApp</h1>
        <p className="mt-1 text-sm opacity-80">Número atual: {atual ?? '—'}. Seu histórico e seu plano continuam com você.</p>
      </header>

      {erro ? (
        <p role="alert" data-testid="erro" className="rounded border border-red-400 p-3 text-sm text-red-300">
          {erro.message}
          {erro.retryAfterSeconds ? ` Tente de novo em ${formatarEspera(erro.retryAfterSeconds)}.` : ''}
        </p>
      ) : null}
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}

      {etapa === 'numero' ? (
        <form onSubmit={enviar} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Novo WhatsApp com DDD
            <input data-testid="novo-telefone" type="tel" inputMode="tel" placeholder="(11) 98765-4321" value={novo} onChange={(e) => setNovo(e.target.value)} className="rounded border border-white/30 bg-transparent p-3 text-base" required />
          </label>
          <button data-testid="enviar-codigo" disabled={ocupado} className="rounded bg-destaque p-3 font-semibold text-black disabled:opacity-60">
            Enviar código para o número novo
          </button>
        </form>
      ) : null}

      {etapa === 'codigo' ? (
        <form onSubmit={confirmar} className="flex flex-col gap-3">
          <p className="text-sm">Digite o código que chegou no número novo. Ele vale por 5 minutos.</p>
          <input data-testid="codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} className="rounded border border-white/30 bg-transparent p-3 text-center text-2xl tracking-widest" aria-label="Código de 6 dígitos" />
          <button data-testid="confirmar" disabled={ocupado || codigo.length !== 6} className="rounded bg-destaque p-3 font-semibold text-black disabled:opacity-60">
            Confirmar troca
          </button>
          <button type="button" onClick={() => void enviar()} disabled={ocupado} className="text-sm underline">Enviar um novo código</button>
          <button type="button" onClick={() => { setErro(null); setEtapa('numero') }} className="text-sm underline">Digitar outro número</button>
        </form>
      ) : null}

      {etapa === 'pronto' ? (
        <p role="status" data-testid="trocado" className="rounded border border-green-400 p-3 text-sm text-green-300">
          Pronto! Seu WhatsApp agora é {atual}. A partir de agora o código chega nesse número.
        </p>
      ) : null}

      {!google ? (
        <section className="flex flex-col gap-2 border-t border-white/20 pt-4">
          <h2 className="font-semibold">Entrar com Google</h2>
          <p className="text-sm opacity-80">Opcional: depois de vincular, você entra pelo Google sem precisar do código.</p>
          <button data-testid="vincular-google" onClick={() => void vincularGoogle()} className="rounded border border-white/40 p-3">Vincular Google</button>
          {reautenticar ? (
            <ReautenticarPainel googleVinculado={false} voltar={caminho} aoConfirmar={() => { setReautenticar(false); setMsg('Identidade confirmada. Toque em "Vincular Google" de novo.') }} />
          ) : null}
        </section>
      ) : (
        <p className="text-sm opacity-80">Google vinculado.</p>
      )}
    </main>
  )
}
