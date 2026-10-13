// Servidor de produção do processo web: arquivos de dist/client + SSR do TanStack Start (dist/server).
//
// Por que não `srvx --static`: no Node 22 (Windows) FileHandle.stat() e stat(caminho) devolvem `dev`
// diferentes para o mesmo arquivo, e o middleware estático do srvx 1.0.5 compara `dev` e descarta o
// arquivo (404 em todo /assets). Aqui o srvx só faz a ponte HTTP -> fetch; o estático é nosso.
// O deploy definitivo (adapter, health, versão) é decidido no T12.
import { createReadStream } from 'node:fs'
import { realpath, stat } from 'node:fs/promises'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { serve } from 'srvx'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const dirCliente = resolve(raiz, 'client')
// Caminho real da pasta de estáticos: um symlink dentro dela não pode apontar para fora (ver responderEstatico).
const dirClienteReal = await realpath(dirCliente)

const TIPOS = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/vnd.microsoft.icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json; charset=utf-8',
}

/** Resolve o caminho da URL dentro de dist/client; null se sair da pasta ou for inválido. */
function caminhoDoArquivo(pathname) {
  let decodificado
  try {
    decodificado = decodeURIComponent(pathname)
  } catch {
    return null
  }
  if (decodificado.includes('\0')) return null
  const alvo = resolve(join(dirCliente, decodificado))
  return alvo.startsWith(dirCliente + sep) ? alvo : null
}

/** Responde um arquivo estático ou devolve null para a requisição seguir ao SSR. */
async function responderEstatico(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null
  const { pathname } = new URL(request.url)
  const arquivo = caminhoDoArquivo(pathname)
  if (!arquivo) return null
  const real = await realpath(arquivo).catch(() => null)
  if (!real?.startsWith(dirClienteReal + sep)) return null // inexistente ou symlink que sai de dist/client
  const info = await stat(real).catch(() => null)
  if (!info?.isFile()) return null

  const headers = new Headers({
    'content-type': TIPOS[extname(real)] ?? 'application/octet-stream',
    'content-length': String(info.size),
    // Os nomes em /assets levam hash do conteúdo; o resto precisa revalidar.
    'cache-control': pathname.startsWith('/assets/')
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=0, must-revalidate',
  })
  const corpo = request.method === 'HEAD' ? null : Readable.toWeb(createReadStream(real))
  return new Response(corpo, { status: 200, headers })
}

const { default: aplicacao } = await import(pathToFileURL(join(raiz, 'server', 'server.js')).href)

// CHECK_START=1 (só em `pnpm check:start`): porta efêmera, linha de "pronto" com a URL real e encerramento
// gracioso quando o stdin do processo pai fecha (evita matar o processo no Windows). Em produção não age.
const modoVerificacao = process.env.CHECK_START === '1'

let servidor
try {
  servidor = serve({
    port: Number(process.env.PORT ?? 3000),
    fetch: async (request) => (await responderEstatico(request)) ?? aplicacao.fetch(request),
  })
  await servidor.ready()
} catch (erro) {
  console.error(
    `start-web: não foi possível iniciar o servidor: ${erro instanceof Error ? erro.message : String(erro)}`,
  )
  process.exit(1)
}

if (modoVerificacao) {
  const endereco = servidor.node?.server?.address()
  if (!endereco || typeof endereco === 'string') {
    console.error('start-web: não foi possível obter a porta real do servidor')
    process.exit(1)
  }
  console.log(`PRONTO http://localhost:${endereco.port}`)
  process.stdin.resume()
  process.stdin.once('end', () => {
    servidor.close(true).then(
      () => process.exit(0),
      () => process.exit(1),
    )
  })
}
