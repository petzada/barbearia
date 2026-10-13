// Servidor de produção do processo web: arquivos de dist/client + SSR do TanStack Start (dist/server).
//
// Por que não `srvx --static`: no Node 22 (Windows) FileHandle.stat() e stat(caminho) devolvem `dev`
// diferentes para o mesmo arquivo, e o middleware estático do srvx 1.0.5 compara `dev` e descarta o
// arquivo (404 em todo /assets). Aqui o srvx só faz a ponte HTTP -> fetch; o estático é nosso.
// O deploy definitivo (adapter, health, versão) é decidido no T12.
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { serve } from 'srvx'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const dirCliente = resolve(raiz, 'client')

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
  const info = await stat(arquivo).catch(() => null)
  if (!info?.isFile()) return null

  const headers = new Headers({
    'content-type': TIPOS[extname(arquivo)] ?? 'application/octet-stream',
    'content-length': String(info.size),
    // Os nomes em /assets levam hash do conteúdo; o resto precisa revalidar.
    'cache-control': pathname.startsWith('/assets/')
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=0, must-revalidate',
  })
  const corpo = request.method === 'HEAD' ? null : Readable.toWeb(createReadStream(arquivo))
  return new Response(corpo, { status: 200, headers })
}

const { default: aplicacao } = await import(pathToFileURL(join(raiz, 'server', 'server.js')).href)

const servidor = serve({
  port: Number(process.env.PORT ?? 3000),
  fetch: async (request) => (await responderEstatico(request)) ?? aplicacao.fetch(request),
})
await servidor.ready()
