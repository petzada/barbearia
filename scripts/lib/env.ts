import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { config } from 'dotenv'

export const BANCO_DEV = 'barbearia_dev'
export const BANCO_TEST = 'barbearia_test'
const ARQUIVO_ENV = resolve(process.cwd(), '.env.local')

export function carregarEnvLocal(): void {
  config({ path: ARQUIVO_ENV, quiet: true })
}

export function exigirVariavel(nome: string): string {
  const valor = process.env[nome]
  if (!valor) {
    throw new Error(`Variável ${nome} ausente. Rode "pnpm db:bootstrap" (veja o AGENTS.md).`)
  }
  return valor
}

/** Troca só o nome do banco de uma URL, sem expor credenciais. */
export function urlParaBanco(urlBase: string, nomeDoBanco: string): string {
  const url = new URL(urlBase)
  url.pathname = `/${nomeDoBanco}`
  return url.toString()
}

function comTlsSemVerificacao(urlTexto: string): string {
  const url = new URL(urlTexto)
  url.searchParams.set('sslmode', 'no-verify')
  return url.toString()
}

/**
 * URL administrativa (banco padrão `railway`) montada a partir do Railway CLI logado.
 * D0082: nunca é impressa; serve só para criar bancos. TLS sem verificação de CA porque o
 * Postgres do Railway usa certificado autoassinado.
 */
export function urlAdministrativaDoRailway(): string {
  const saida = execFileSync('railway', ['variables', '--json'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const v = JSON.parse(saida) as Record<string, string | undefined>
  const publica = v['DATABASE_PUBLIC_URL']
  if (publica) return comTlsSemVerificacao(publica)

  const { PGUSER, PGPASSWORD, PGDATABASE, RAILWAY_TCP_PROXY_DOMAIN, RAILWAY_TCP_PROXY_PORT } = v
  if (
    !PGUSER ||
    !PGPASSWORD ||
    !PGDATABASE ||
    !RAILWAY_TCP_PROXY_DOMAIN ||
    !RAILWAY_TCP_PROXY_PORT
  ) {
    throw new Error(
      'O serviço Postgres do Railway não tem proxy TCP público. Rode "railway link" e confira o proxy (D0082).',
    )
  }
  const url = new URL('postgresql://localhost')
  url.username = PGUSER
  url.password = PGPASSWORD
  url.hostname = RAILWAY_TCP_PROXY_DOMAIN
  url.port = RAILWAY_TCP_PROXY_PORT
  url.pathname = `/${PGDATABASE}`
  return comTlsSemVerificacao(url.toString())
}

/** Atualiza (ou acrescenta) chaves em .env.local preservando as demais linhas. */
export function gravarEnvLocal(valores: Record<string, string>): void {
  const linhas = existsSync(ARQUIVO_ENV)
    ? readFileSync(ARQUIVO_ENV, 'utf8')
        .split(/\r?\n/)
        .filter((linha) => linha !== '')
    : []
  const pendentes = new Map(Object.entries(valores))
  const atualizadas = linhas.map((linha) => {
    const chave = linha.split('=')[0]?.trim() ?? ''
    const novo = pendentes.get(chave)
    if (novo === undefined) return linha
    pendentes.delete(chave)
    return `${chave}=${novo}`
  })
  for (const [chave, valor] of pendentes) atualizadas.push(`${chave}=${valor}`)
  writeFileSync(ARQUIVO_ENV, `${atualizadas.join('\n')}\n`, 'utf8')
}
