// D0082: o Postgres é compartilhado com o deploy do Railway; só tocamos bancos descartáveis.
const SUFIXOS_PERMITIDOS = ['_dev', '_test'] as const

export class BancoNaoPermitidoError extends Error {
  constructor(nomeDoBanco: string) {
    super(
      `Recusado: o banco "${nomeDoBanco}" não termina em ${SUFIXOS_PERMITIDOS.join(' ou ')} (D0082).`,
    )
    this.name = 'BancoNaoPermitidoError'
  }
}

export function nomeDoBancoDaUrl(url: string): string {
  const nome = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''))
  if (nome.length === 0) throw new Error('A URL do banco não informa o nome do banco.')
  return nome
}

export function bancoDescartavel(nomeDoBanco: string): boolean {
  return SUFIXOS_PERMITIDOS.some(
    (sufixo) => nomeDoBanco.endsWith(sufixo) && nomeDoBanco.length > sufixo.length,
  )
}

/** Lança se o banco da URL não for `*_dev` ou `*_test`. Usar antes de reset, migração destrutiva e testes. */
export function exigirBancoDescartavel(url: string): string {
  const nome = nomeDoBancoDaUrl(url)
  if (!bancoDescartavel(nome)) throw new BancoNaoPermitidoError(nome)
  return nome
}
