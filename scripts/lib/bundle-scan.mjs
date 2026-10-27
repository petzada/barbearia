import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Varredura do artefato de build (T04, ressalva (b) do T02): o bundle do navegador não pode carregar código nem
// nomes do servidor. A lógica fica aqui para o teste (`tests/security/bundle.test.ts`) provar que o detector
// detecta (controle positivo) e para o script `check:bundle` usar a mesma função no `dist/` real.

/** Textos que só existem no servidor: nome da operação interna, tabelas, variáveis de ambiente e segredos. */
export const TOKENS_PROIBIDOS_NO_CLIENTE = [
  'dispatchOperation',
  'dispatchBrowserOperation',
  'chaves_idempotencia',
  'otp_desafios',
  'codigo_hash',
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'GOOGLE_CLIENT_SECRET',
  'pg_advisory_xact_lock',
  'hashOtpCode',
]

export function listarArquivos(pasta) {
  const saida = []
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome)
    if (statSync(caminho).isDirectory()) saida.push(...listarArquivos(caminho))
    else saida.push(caminho)
  }
  return saida
}

/** Devolve `{ arquivo, token }` para cada ocorrência de token em arquivo de texto da pasta. */
export function varrerPasta(pasta, tokens) {
  const achados = []
  for (const arquivo of listarArquivos(pasta)) {
    if (!/\.(js|mjs|cjs|css|html|json|map|txt)$/.test(arquivo)) continue
    const conteudo = readFileSync(arquivo, 'utf8')
    for (const token of tokens) {
      if (conteudo.includes(token)) achados.push({ arquivo, token })
    }
  }
  return achados
}
