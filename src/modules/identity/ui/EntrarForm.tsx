import { useEffect, useState, type FormEvent } from 'react'
import { caminhoSeguro, chamarAuth, formatarEspera, type ErroDeApi } from './api'

// A01: telefone → código → (nome + aceite) → destino original. Marcação mínima: o T05 troca o visual e mantém os
// estados, os textos de erro e os atributos `data-testid` (usados pelo e2e).

interface Documento {
  tipo: 'termos' | 'privacidade'
  versao: string
  texto: string
}

type Etapa = 'telefone' | 'codigo' | 'perfil'

const TITULO: Record<string, string> = { termos: 'Termos de Uso', privacidade: 'Política de Privacidade' }

export function EntrarForm({ voltar, erroInicial }: { voltar: string; erroInicial?: string }) {
  const destino = caminhoSeguro(voltar, '/')
  const [etapa, setEtapa] = useState<Etapa>('telefone')
  const [telefone, setTelefone] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [continuacao, setContinuacao] = useState('')
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [aceito, setAceito] = useState(false)
  const [erro, setErro] = useState<ErroDeApi | null>(
    erroInicial === 'google'
      ? {
          code: 'GOOGLE',
          message:
            'Não encontramos uma conta ligada a esse Google. Entre com o código no WhatsApp e vincule o Google depois, no seu perfil.',
        }
      : null,
  )
  const [enviando, setEnviando] = useState(false)
  const [google, setGoogle] = useState(false)

  useEffect(() => {
    void chamarAuth<{ google: boolean }>('/identity/config', undefined, 'GET').then((r) => {
      if (r.ok) setGoogle(r.dados.google)
    })
  }, [])

  const falha = (e: ErroDeApi, voltarPara?: Etapa) => {
    setErro(e)
    if (voltarPara) setEtapa(voltarPara)
    setEnviando(false)
  }

  async function enviarCodigo(evento?: FormEvent) {
    evento?.preventDefault()
    setEnviando(true)
    setErro(null)
    const r = await chamarAuth('/identity/otp/send', { telefone })
    if (!r.ok) return falha(r.erro)
    setCodigo('')
    setEtapa('codigo')
    setEnviando(false)
  }

  async function confirmarCodigo(evento: FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    setErro(null)
    const r = await chamarAuth<{
      status: 'logged_in' | 'needs_profile'
      continuacao?: string
      nomeSugerido?: string | null
      documentos?: Documento[]
    }>('/identity/otp/verify', { telefone, codigo })
    if (!r.ok) {
      // Código errado mantém a tela; tentativas esgotadas pedem um código novo.
      if (r.erro.code === 'IDENTITY.OTP_ATTEMPTS_EXCEEDED') setCodigo('')
      return falha(r.erro)
    }
    if (r.dados.status === 'logged_in') {
      window.location.assign(destino)
      return
    }
    setContinuacao(r.dados.continuacao ?? '')
    setNome(r.dados.nomeSugerido ?? '')
    setDocumentos(r.dados.documentos ?? [])
    setEtapa('perfil')
    setEnviando(false)
  }

  async function concluir(evento: FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    setErro(null)
    const versao = (tipo: string) => documentos.find((d) => d.tipo === tipo)?.versao ?? ''
    const r = await chamarAuth('/identity/otp/complete', {
      continuacao,
      nome,
      aceites: { termos: versao('termos'), privacidade: versao('privacidade') },
    })
    if (!r.ok) {
      // Confirmação vencida ou usada: recomeça pelo telefone, sem perder o que a pessoa digitou.
      return falha(r.erro, r.erro.code === 'IDENTITY.CONTINUATION_INVALID' ? 'telefone' : undefined)
    }
    window.location.assign(destino)
  }

  async function entrarComGoogle() {
    setEnviando(true)
    setErro(null)
    const r = await chamarAuth<{ url?: string }>('/sign-in/social', {
      provider: 'google',
      callbackURL: destino,
      errorCallbackURL: `/entrar?erro=google&voltar=${encodeURIComponent(destino)}`,
    })
    if (!r.ok || !r.dados.url) return falha(r.ok ? { code: 'GOOGLE', message: 'Não foi possível abrir o Google agora.' } : r.erro)
    window.location.assign(r.dados.url)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 p-6" data-testid="entrar">
      <header>
        <h1 className="text-2xl font-bold text-destaque">Entrar</h1>
        <p className="mt-1 text-sm opacity-80">Use o seu WhatsApp. Enviamos um código de 6 dígitos.</p>
      </header>

      {erro ? (
        <p role="alert" data-testid="erro" className="rounded border border-red-400 p-3 text-sm text-red-300">
          {erro.message}
          {erro.retryAfterSeconds ? ` Tente de novo em ${formatarEspera(erro.retryAfterSeconds)}.` : ''}
        </p>
      ) : null}

      {etapa === 'telefone' ? (
        <form onSubmit={enviarCodigo} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            WhatsApp com DDD
            <input
              data-testid="telefone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(11) 98765-4321"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="rounded border border-white/30 bg-transparent p-3 text-base"
              required
            />
          </label>
          <button data-testid="enviar-codigo" disabled={enviando} className="rounded bg-destaque p-3 font-semibold text-black disabled:opacity-60">
            {enviando ? 'Enviando…' : 'Enviar código'}
          </button>
          {google ? (
            <button type="button" data-testid="entrar-google" onClick={() => void entrarComGoogle()} disabled={enviando} className="rounded border border-white/40 p-3">
              Entrar com Google
            </button>
          ) : null}
        </form>
      ) : null}

      {etapa === 'codigo' ? (
        <form onSubmit={confirmarCodigo} className="flex flex-col gap-3">
          <p className="text-sm">Enviamos o código para o seu WhatsApp. Ele vale por 5 minutos.</p>
          <label className="flex flex-col gap-1 text-sm">
            Código de 6 dígitos
            <input
              data-testid="codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
              className="rounded border border-white/30 bg-transparent p-3 text-center text-2xl tracking-widest"
              required
            />
          </label>
          <button data-testid="confirmar-codigo" disabled={enviando || codigo.length !== 6} className="rounded bg-destaque p-3 font-semibold text-black disabled:opacity-60">
            {enviando ? 'Conferindo…' : 'Confirmar'}
          </button>
          <button type="button" data-testid="reenviar" onClick={() => void enviarCodigo()} disabled={enviando} className="text-sm underline">
            Enviar um novo código
          </button>
          <button type="button" onClick={() => { setErro(null); setEtapa('telefone') }} className="text-sm underline">
            Trocar o número
          </button>
        </form>
      ) : null}

      {etapa === 'perfil' ? (
        <form onSubmit={concluir} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Seu nome
            <input data-testid="nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} className="rounded border border-white/30 bg-transparent p-3 text-base" minLength={2} maxLength={120} required />
          </label>
          {documentos.map((d) => (
            <details key={d.tipo} className="text-sm">
              <summary className="cursor-pointer underline">{TITULO[d.tipo] ?? d.tipo} (versão {d.versao})</summary>
              <p className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded border border-white/20 p-2">{d.texto}</p>
            </details>
          ))}
          <label className="flex items-start gap-2 text-sm">
            <input data-testid="aceite" type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} className="mt-1" />
            Li e aceito os Termos de Uso e a Política de Privacidade.
          </label>
          <button data-testid="concluir" disabled={enviando || !aceito || nome.trim().length < 2} className="rounded bg-destaque p-3 font-semibold text-black disabled:opacity-60">
            {enviando ? 'Entrando…' : 'Criar conta e entrar'}
          </button>
        </form>
      ) : null}
    </main>
  )
}
