import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { defaultBrand } from '~/ui/brand/brand-config'

const raiz = resolve(import.meta.dirname, '..', '..')
const publico = (...partes: string[]) =>
  resolve(raiz, 'public', ...partes.map((p) => p.replace(/^\/+/, '')))

interface IconeManifesto {
  src: string
  sizes: string
  type: string
  purpose?: string
}
interface Manifesto {
  name: string
  short_name: string
  start_url: string
  scope: string
  display: string
  lang: string
  background_color: string
  theme_color: string
  icons: IconeManifesto[]
}

const manifesto = JSON.parse(readFileSync(publico('manifest.webmanifest'), 'utf8')) as Manifesto

/** Largura e altura lidas do bloco IHDR do PNG (sem dependência de imagem). */
function dimensoesPng(arquivo: string): { largura: number; altura: number } {
  const buf = readFileSync(arquivo)
  expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG')
  return { largura: buf.readUInt32BE(16), altura: buf.readUInt32BE(20) }
}

describe('manifest do PWA (instalável)', () => {
  it('tem os campos exigidos para instalar e abre em tela cheia', () => {
    expect(manifesto.name).toBeTruthy()
    expect(manifesto.short_name).toBeTruthy()
    expect(manifesto.start_url).toBe('/')
    expect(manifesto.scope).toBe('/')
    expect(manifesto.display).toBe('standalone')
    expect(manifesto.lang).toBe('pt-BR')
    expect(manifesto.background_color).toMatch(/^#[0-9a-f]{6}$/i)
    expect(manifesto.theme_color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('combina com a marca padrão (nome e cor do tema)', () => {
    expect(manifesto.name).toBe(defaultBrand.nome)
    expect(manifesto.short_name).toBe(defaultBrand.nomeCurto)
    expect(manifesto.theme_color).toBe(defaultBrand.corTema)
  })

  it('declara ícones 192 e 512 e um maskable, e os arquivos existem com o tamanho declarado', () => {
    const porPropósito = (p: string) => manifesto.icons.filter((i) => (i.purpose ?? 'any') === p)
    const tamanhos = porPropósito('any').map((i) => i.sizes)
    expect(tamanhos).toContain('192x192')
    expect(tamanhos).toContain('512x512')
    expect(porPropósito('maskable').length).toBeGreaterThan(0)

    for (const icone of manifesto.icons) {
      expect(icone.type).toBe('image/png')
      const [l, a] = icone.sizes.split('x').map(Number)
      expect(dimensoesPng(publico(icone.src))).toEqual({ largura: l, altura: a })
    }
  })

  it('os caminhos de ícone da marca padrão apontam para arquivos que existem', () => {
    const { icones } = defaultBrand
    expect(dimensoesPng(publico(icones.icone192)).largura).toBe(192)
    expect(dimensoesPng(publico(icones.icone512)).largura).toBe(512)
    expect(dimensoesPng(publico(icones.mascaravel512)).largura).toBe(512)
    expect(dimensoesPng(publico(icones.apple180)).largura).toBe(180)
  })
})

// ——— Service worker, executado de verdade em um contexto isolado com cache e rede simulados ———

type Ouvinte = (evento: unknown) => void

interface RespostaFalsa {
  status: number
  type: string
  headers: Headers
  clone: () => RespostaFalsa
  marca: string
}

function resposta(marca: string, cabecalhos: Record<string, string> = {}): RespostaFalsa {
  const r: RespostaFalsa = {
    status: 200,
    type: 'basic',
    headers: new Headers(cabecalhos),
    clone: () => r,
    marca,
  }
  return r
}

function carregarSw(opcoes: { online?: boolean } = {}) {
  const ouvintes = new Map<string, Ouvinte>()
  const caches = new Map<string, Map<string, RespostaFalsa>>()
  let online = opcoes.online ?? true
  const buscadas: string[] = []
  const respostas = new Map<string, RespostaFalsa>()

  const chaveDe = (pedido: string | { url: string }) =>
    typeof pedido === 'string' ? pedido : pedido.url
  const urlAbsoluta = (u: string) => (u.startsWith('http') ? u : `https://app.test${u}`)

  const cacheApi = {
    open: (nome: string) => {
      if (!caches.has(nome)) caches.set(nome, new Map())
      const mapa = caches.get(nome)!
      return Promise.resolve({
        match: (p: string | { url: string }) => Promise.resolve(mapa.get(urlAbsoluta(chaveDe(p)))),
        put: (p: string | { url: string }, r: RespostaFalsa) => {
          mapa.set(urlAbsoluta(chaveDe(p)), r)
          return Promise.resolve()
        },
        addAll: (urls: string[]) => {
          for (const u of urls) mapa.set(urlAbsoluta(u), resposta(`precache:${u}`))
          return Promise.resolve()
        },
      })
    },
    match: (p: string) => {
      for (const mapa of caches.values()) {
        const achou = mapa.get(urlAbsoluta(chaveDe(p)))
        if (achou) return Promise.resolve(achou)
      }
      return Promise.resolve(undefined)
    },
    keys: () => Promise.resolve([...caches.keys()]),
    delete: (nome: string) => Promise.resolve(caches.delete(nome)),
  }

  const self = {
    location: { origin: 'https://app.test' },
    addEventListener: (tipo: string, fn: Ouvinte) => ouvintes.set(tipo, fn),
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
  }

  const fetchFalso = (pedido: { url: string }) => {
    buscadas.push(pedido.url)
    if (!online) return Promise.reject(new Error('offline'))
    return Promise.resolve(respostas.get(pedido.url) ?? resposta(`rede:${pedido.url}`))
  }

  const codigo = readFileSync(publico('sw.js'), 'utf8')
  runInNewContext(codigo, {
    self,
    caches: cacheApi,
    fetch: fetchFalso,
    URL,
    Promise,
    Response: { error: () => ({ erro: true }) },
  })

  async function instalar() {
    const promessas: Promise<unknown>[] = []
    ouvintes.get('install')?.({ waitUntil: (p: Promise<unknown>) => promessas.push(p) })
    await Promise.all(promessas)
  }

  async function ativar() {
    const promessas: Promise<unknown>[] = []
    ouvintes.get('activate')?.({ waitUntil: (p: Promise<unknown>) => promessas.push(p) })
    await Promise.all(promessas)
  }

  async function pedir(url: string, init: { method?: string; mode?: string } = {}) {
    let promessa: Promise<unknown> | null = null
    ouvintes.get('fetch')?.({
      request: { url: urlAbsoluta(url), method: init.method ?? 'GET', mode: init.mode ?? 'cors' },
      respondWith: (p: Promise<unknown>) => {
        promessa = p
      },
    })
    return {
      tratado: promessa !== null,
      resposta: promessa ? ((await promessa) as RespostaFalsa) : null,
    }
  }

  return {
    instalar,
    ativar,
    pedir,
    caches,
    buscadas,
    ficarOffline: () => {
      online = false
    },
    definirResposta: (url: string, r: RespostaFalsa) => respostas.set(urlAbsoluta(url), r),
  }
}

describe('service worker: só estático, nunca dado pessoal (PRD §4.1, §7.8)', () => {
  it('instala guardando o shell estático e a página offline', async () => {
    const sw = carregarSw()
    await sw.instalar()
    const guardados = [...(sw.caches.get('shell-v1')?.keys() ?? [])]
    expect(guardados).toContain('https://app.test/offline.html')
    expect(guardados).toContain('https://app.test/manifest.webmanifest')
    expect(guardados.every((u) => !u.includes('/api') && !u.includes('_serverFn'))).toBe(true)
  })

  it('navegação online vai à rede e NÃO é guardada (o HTML pode ter dado da pessoa)', async () => {
    const sw = carregarSw()
    await sw.instalar()
    const antes = sw.caches.get('shell-v1')?.size
    const r = await sw.pedir('/app/plano', { mode: 'navigate' })
    expect(r.tratado).toBe(true)
    expect(r.resposta?.marca).toBe('rede:https://app.test/app/plano')
    expect(sw.caches.get('shell-v1')?.size).toBe(antes)
  })

  it('navegação sem rede mostra a página offline', async () => {
    const sw = carregarSw()
    await sw.instalar()
    sw.ficarOffline()
    const r = await sw.pedir('/app/reservas', { mode: 'navigate' })
    expect(r.resposta?.marca).toBe('precache:/offline.html')
  })

  it('chamadas ao servidor e API passam direto, sem cache', async () => {
    const sw = carregarSw()
    await sw.instalar()
    for (const caminho of ['/_serverFn/abc123', '/api/webhooks/pagamentos', '/api/saude']) {
      const r = await sw.pedir(caminho)
      expect(r.tratado, caminho).toBe(false)
    }
    expect(
      [...(sw.caches.get('shell-v1')?.keys() ?? [])].some((u) => u.includes('_serverFn')),
    ).toBe(false)
  })

  it('só intercepta GET e o mesmo domínio', async () => {
    const sw = carregarSw()
    await sw.instalar()
    expect((await sw.pedir('/assets/app-1.js', { method: 'POST' })).tratado).toBe(false)
    expect((await sw.pedir('https://cdn.outro.site/assets/x.js')).tratado).toBe(false)
  })

  it('arquivo de /assets/ é guardado no 1º acesso e servido do cache depois', async () => {
    const sw = carregarSw()
    await sw.instalar()
    const primeira = await sw.pedir('/assets/app-9f3a.js')
    expect(primeira.resposta?.marca).toBe('rede:https://app.test/assets/app-9f3a.js')
    expect(sw.caches.get('shell-v1')?.has('https://app.test/assets/app-9f3a.js')).toBe(true)

    sw.ficarOffline()
    const segunda = await sw.pedir('/assets/app-9f3a.js')
    expect(segunda.resposta?.marca).toBe('rede:https://app.test/assets/app-9f3a.js')
  })

  it('resposta com no-store, private, Set-Cookie ou erro não é guardada', async () => {
    const sw = carregarSw()
    await sw.instalar()
    sw.definirResposta('/assets/a.js', resposta('a', { 'Cache-Control': 'no-store' }))
    sw.definirResposta('/assets/b.js', resposta('b', { 'Cache-Control': 'private, max-age=60' }))
    sw.definirResposta('/assets/c.js', resposta('c', { 'Set-Cookie': 'sid=1' }))
    sw.definirResposta('/assets/d.js', { ...resposta('d'), status: 500 })
    sw.definirResposta('/assets/e.js', { ...resposta('e'), type: 'opaque' })
    for (const nome of ['a', 'b', 'c', 'd', 'e']) await sw.pedir(`/assets/${nome}.js`)
    const guardados = [...(sw.caches.get('shell-v1')?.keys() ?? [])]
    expect(guardados.filter((u) => u.includes('/assets/'))).toEqual([])
  })

  it('ao ativar, apaga caches de versões antigas', async () => {
    const sw = carregarSw()
    sw.caches.set('shell-v0', new Map())
    sw.caches.set('outro-cache', new Map())
    await sw.instalar()
    await sw.ativar()
    expect([...sw.caches.keys()]).toEqual(['shell-v1'])
  })
})
