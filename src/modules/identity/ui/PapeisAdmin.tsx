import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { newIdempotencyKey } from '~/contracts/command'
import {
  buscarPorTelefoneRemoto,
  concederPapelRemoto,
  listarEquipeRemoto,
  meRemoto,
  revogarPapelRemoto,
} from '../client'
import { ReautenticarPainel } from './ReautenticarPainel'

// D04-papéis (admin, desktop): lista de membros, conceder e revogar. Conceder/revogar exigem login recente
// (D0071): ao receber AUTH.RECENT_REQUIRED a tela pede a reautenticação e repete a ação sozinha.

type Papel = 'barbeiro' | 'admin'
interface Membro {
  id: string
  nome: string
  telefoneMascarado: string | null
  papeisEquipe: readonly string[]
}
interface Achado {
  usuarioId: string
  nome: string
  telefoneMascarado: string
  estado: string
}
interface Pendente {
  rotulo: string
  executar: () => Promise<{ status: string; code?: string; message?: string }>
}

const NOME_DO_PAPEL: Record<string, string> = { barbeiro: 'Barbeiro', admin: 'Administrador' }

export function PapeisAdmin() {
  const caminho = '/admin/equipe/papeis'
  const [carregando, setCarregando] = useState(true)
  const [permitido, setPermitido] = useState(false)
  const [google, setGoogle] = useState(false)
  const [membros, setMembros] = useState<Membro[]>([])
  const [telefone, setTelefone] = useState('')
  const [achado, setAchado] = useState<Achado | null | undefined>(undefined)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [pendente, setPendente] = useState<Pendente | null>(null)

  const recarregar = useCallback(async () => {
    const r = await listarEquipeRemoto({})
    if (r.status === 'ok') setMembros(r.data.membros as Membro[])
  }, [])

  useEffect(() => {
    void (async () => {
      const eu = await meRemoto({})
      if (eu.status !== 'ok') {
        window.location.assign(`/entrar?voltar=${encodeURIComponent(caminho)}`)
        return
      }
      setGoogle(eu.data.google)
      if (eu.data.roles.includes('admin')) {
        setPermitido(true)
        await recarregar()
      }
      setCarregando(false)
    })()
  }, [recarregar])

  async function executar(acao: Pendente) {
    setErro(null)
    setAviso(null)
    const r = await acao.executar()
    if (r.status === 'ok') {
      setPendente(null)
      setAviso(`${acao.rotulo}: feito.`)
      setAchado(undefined)
      await recarregar()
      return
    }
    if (r.code === 'AUTH.RECENT_REQUIRED') return setPendente(acao) // pede a reautenticação e depois repete
    setPendente(null)
    setErro(r.message ?? 'Não foi possível concluir. Tente novamente.')
  }

  const conceder = (usuarioId: string, papel: Papel, nome: string) =>
    executar({
      rotulo: `${NOME_DO_PAPEL[papel]} concedido a ${nome}`,
      executar: () => concederPapelRemoto({ idempotencyKey: newIdempotencyKey(), usuarioId, papel }),
    })

  const revogar = (usuarioId: string, papel: string, nome: string) => {
    if (!window.confirm(`Remover o papel de ${NOME_DO_PAPEL[papel] ?? papel} de ${nome}? Vale na hora.`)) return Promise.resolve()
    return executar({
      rotulo: `${NOME_DO_PAPEL[papel] ?? papel} removido de ${nome}`,
      executar: () =>
        revogarPapelRemoto({ idempotencyKey: newIdempotencyKey(), usuarioId, papel: papel as Papel }),
    })
  }

  async function buscar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setAchado(undefined)
    const r = await buscarPorTelefoneRemoto({ telefone })
    if (r.status !== 'ok') return setErro(r.status === 'error' ? r.message : 'Não foi possível buscar.')
    setAchado(r.data.usuario as Achado | null)
  }

  if (carregando) return <p className="p-6">Carregando…</p>
  if (!permitido) return <p className="p-6" role="alert" data-testid="sem-acesso">Acesso restrito aos administradores.</p>

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6" data-testid="papeis">
      <h1 className="text-2xl font-bold text-destaque">Equipe e papéis</h1>
      {erro ? <p role="alert" data-testid="erro" className="rounded border border-red-400 p-3 text-sm text-red-300">{erro}</p> : null}
      {aviso ? <p role="status" data-testid="aviso" className="rounded border border-green-400 p-3 text-sm text-green-300">{aviso}</p> : null}

      {pendente ? (
        <ReautenticarPainel googleVinculado={google} voltar={caminho} aoConfirmar={() => void executar(pendente)} />
      ) : null}

      <section aria-labelledby="membros">
        <h2 id="membros" className="mb-2 font-semibold">Membros</h2>
        <table className="w-full text-left text-sm" data-testid="membros">
          <thead>
            <tr className="border-b border-white/20"><th className="py-2">Nome</th><th>WhatsApp</th><th>Papéis</th><th /></tr>
          </thead>
          <tbody>
            {membros.map((m) => (
              <tr key={m.id} className="border-b border-white/10" data-testid="membro">
                <td className="py-2">{m.nome}</td>
                <td>{m.telefoneMascarado ?? '—'}</td>
                <td>{m.papeisEquipe.map((p) => NOME_DO_PAPEL[p] ?? p).join(', ')}</td>
                <td className="text-right">
                  {m.papeisEquipe.map((p) => (
                    <button key={p} onClick={() => void revogar(m.id, p, m.nome)} data-testid={`revogar-${p}`} className="ml-2 rounded border border-red-400 px-2 py-1 text-red-300">
                      Remover {NOME_DO_PAPEL[p] ?? p}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="conceder" className="flex flex-col gap-3">
        <h2 id="conceder" className="font-semibold">Dar acesso de equipe</h2>
        <p className="text-sm opacity-80">A pessoa precisa já ter conta (ter entrado no app). Busque pelo WhatsApp.</p>
        <form onSubmit={buscar} className="flex gap-2">
          <input data-testid="busca-telefone" type="tel" inputMode="tel" placeholder="(11) 98765-4321" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="flex-1 rounded border border-white/30 bg-transparent p-3" required />
          <button data-testid="buscar" className="rounded border border-white/40 px-4">Buscar</button>
        </form>
        {achado === null ? <p data-testid="nao-encontrado" className="text-sm">Nenhuma conta com esse número. A pessoa precisa entrar no app primeiro.</p> : null}
        {achado ? (
          <div className="flex flex-wrap items-center gap-2 rounded border border-white/20 p-3" data-testid="achado">
            <span className="flex-1">{achado.nome} · {achado.telefoneMascarado}</span>
            {achado.estado === 'ativo' ? (
              <>
                <button data-testid="conceder-barbeiro" onClick={() => void conceder(achado.usuarioId, 'barbeiro', achado.nome)} className="rounded bg-destaque px-3 py-2 font-semibold text-black">Dar Barbeiro</button>
                <button data-testid="conceder-admin" onClick={() => void conceder(achado.usuarioId, 'admin', achado.nome)} className="rounded border border-destaque px-3 py-2">Dar Administrador</button>
              </>
            ) : (
              <span className="text-sm">Esta conta ainda não foi ativada pela própria pessoa.</span>
            )}
          </div>
        ) : null}
      </section>
    </main>
  )
}
