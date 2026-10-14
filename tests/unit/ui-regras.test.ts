import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const raiz = resolve(import.meta.dirname, '..', '..')

function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const caminho = join(dir, e.name)
    if (e.isDirectory()) return arquivos(caminho)
    return /\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.gen.ts') ? [caminho] : []
  })
}

const fontes = [...arquivos(join(raiz, 'src', 'ui')), ...arquivos(join(raiz, 'src', 'routes'))]
  .map((caminho) => ({
    caminho: relative(raiz, caminho).split(sep).join('/'),
    texto: readFileSync(caminho, 'utf8'),
  }))
  .map((f) => ({
    ...f,
    // Comentários explicam o porquê e podem citar APIs proibidas; a regra vale para o código.
    codigo: f.texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''),
  }))

/** Arquivos que podem formatar: os componentes `MoneyText`/`DateTimeText` e seus auxiliares. */
const FORMATACAO = ['src/ui/components/format.tsx', 'src/ui/components/format-data.ts']

function usos(padrao: RegExp, permitidos: string[] = []) {
  return fontes
    .filter((f) => !permitidos.includes(f.caminho) && padrao.test(f.codigo))
    .map((f) => f.caminho)
}

describe('regras do shell de UI (T05)', () => {
  it('dinheiro e data só são formatados por MoneyText/DateTimeText', () => {
    expect(usos(/\.toLocale(Date|Time|String)?\(/, FORMATACAO)).toEqual([])
    expect(usos(/Intl\.(NumberFormat|DateTimeFormat)/, FORMATACAO)).toEqual([])
    expect(usos(/\.toFixed\(/)).toEqual([])
    expect(usos(/formatBRL\(/, FORMATACAO)).toEqual([])
  })

  it('o catálogo e as telas não somam nem multiplicam dinheiro (nenhuma regra de negócio na UI)', () => {
    expect(usos(/(addMoney|subtractMoney|sumMoney|multiplyMoney|applyBasisPoints)/)).toEqual([])
  })

  it('só o módulo de boas-vindas toca em localStorage', () => {
    expect(usos(/localStorage/, ['src/ui/welcome/welcome-rules.ts'])).toEqual([])
  })

  it('a UI não importa servidor, banco nem módulos de negócio', () => {
    expect(usos(/from '~\/(modules|integrations)\//)).toEqual([])
    expect(usos(/from '~\/platform\/(db|audit|idempotency|authz)/)).toEqual([])
    expect(usos(/createServerFn/)).toEqual([])
  })

  it('o modo de desenvolvimento se detecta por MODE, nunca por DEV/PROD (herdam o NODE_ENV do .env.local)', () => {
    expect(usos(/import\.meta\.env\.(DEV|PROD)\b/)).toEqual([])
  })

  it('a sessão de teste por cookie só é lida em modo development', () => {
    const quemLe = usos(/devSessionFromCookie\(/, ['src/ui/session/dev-session.ts'])
    expect(quemLe).toEqual(['src/ui/session/ui-session.ts'])
    const sessao = fontes.find((f) => f.caminho === 'src/ui/session/ui-session.ts')!.texto
    const antes = sessao.slice(0, sessao.indexOf('devSessionFromCookie()'))
    expect(antes.lastIndexOf("if (import.meta.env.MODE === 'development')")).toBeGreaterThan(
      antes.lastIndexOf('async function carregarSessao'),
    )
    expect(usos(/dev_sessao|DEV_SESSION_COOKIE/, ['src/ui/session/dev-session.ts'])).toEqual([])
  })

  it('o catálogo só entra no bundle em modo development', () => {
    const rota = fontes.find((f) => f.caminho === 'src/routes/[_]dev/ui.tsx')!.texto
    expect(rota).toMatch(/import\.meta\.env\.MODE === 'development'\s*\?\s*lazy\(/)
    expect(rota).toMatch(/if \(import\.meta\.env\.MODE !== 'development'\) throw notFound\(\)/)
    expect(usos(/ui\/catalog\/Catalog/, ['src/routes/[_]dev/ui.tsx'])).toEqual([])
  })

  it('toda rota-esqueleto tem destino fora do catálogo de placeholders e usa a guarda da área', () => {
    for (const area of ['app', 'equipe', 'admin']) {
      const layout = fontes.find((f) => f.caminho === `src/routes/${area}/route.tsx`)!.texto
      expect(layout, area).toContain(`guardArea('${area}'`)
      expect(layout, area).toContain('ssr: false')
    }
  })
})
