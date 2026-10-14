/* Service worker do PWA (T05, D0001/D0044).
 *
 * Cache SÓ do que é estático e igual para todo mundo: arquivos de /assets/ (nomes com hash), /icons/, o
 * manifest e a página offline. NUNCA de HTML de rota, de chamadas ao servidor (/_serverFn, /api) nem de
 * qualquer outra resposta: nada de dado pessoal fica no aparelho (PRD §4.1, §7.8). Sem rede, uma
 * navegação mostra /offline.html. Para invalidar tudo, troque VERSAO.
 */
const VERSAO = 'v1'
const CACHE = `shell-${VERSAO}`
const PAGINA_OFFLINE = '/offline.html'
const PRECACHE = [
  PAGINA_OFFLINE,
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
]
const PREFIXOS_ESTATICOS = ['/assets/', '/icons/']

function ehEstaticoCacheavel(url) {
  if (url.pathname === '/manifest.webmanifest' || url.pathname === PAGINA_OFFLINE) return true
  return PREFIXOS_ESTATICOS.some((prefixo) => url.pathname.startsWith(prefixo))
}

/** Só guarda resposta completa e pública do próprio site. */
function ehGuardavel(resposta) {
  if (!resposta || resposta.status !== 200 || resposta.type !== 'basic') return false
  const controle = resposta.headers.get('Cache-Control') || ''
  return !/no-store|private/i.test(controle) && !resposta.headers.has('Set-Cookie')
}

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request
  if (pedido.method !== 'GET') return
  const url = new URL(pedido.url)
  if (url.origin !== self.location.origin) return

  if (pedido.mode === 'navigate') {
    // Rede primeiro e sem guardar: o HTML pode ter dado da pessoa. Offline cai na página estática.
    evento.respondWith(
      fetch(pedido).catch(() => caches.match(PAGINA_OFFLINE).then((r) => r || Response.error())),
    )
    return
  }

  if (!ehEstaticoCacheavel(url)) return

  evento.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(pedido).then((guardado) => {
        const rede = fetch(pedido)
          .then((resposta) => {
            if (ehGuardavel(resposta)) cache.put(pedido, resposta.clone())
            return resposta
          })
          .catch(() => guardado || Response.error())
        return guardado || rede
      }),
    ),
  )
})
