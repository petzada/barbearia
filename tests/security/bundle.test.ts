import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
// @ts-expect-error módulo .mjs sem tipos: é o mesmo código que o `pnpm check:bundle` roda no dist/ real.
import { TOKENS_PROIBIDOS_NO_CLIENTE, varrerPasta } from '../../scripts/lib/bundle-scan.mjs'

// T02 (ressalva b): o bundle do navegador não pode conter código de servidor. A varredura do `dist/` real roda em
// `pnpm check:bundle` (parte do `pnpm verify`, depois do build). Aqui provamos que o DETECTOR funciona: se ele
// deixasse passar um vazamento, o `verify` verde não significaria nada.
type Achado = { arquivo: string; token: string }
const varrer = varrerPasta as (pasta: string, tokens: string[]) => Achado[]
const tokens = TOKENS_PROIBIDOS_NO_CLIENTE as string[]

describe('detector de vazamento no bundle do cliente (controle positivo)', () => {
  const pastas: string[] = []
  afterEach(() => {
    for (const p of pastas.splice(0)) rmSync(p, { recursive: true, force: true })
  })
  const novaPasta = () => {
    const p = mkdtempSync(join(tmpdir(), 'bundle-teste-'))
    pastas.push(p)
    return p
  }

  it('acha cada token proibido, em qualquer subpasta e extensão de texto', () => {
    for (const token of tokens) {
      const pasta = novaPasta()
      mkdirSync(join(pasta, 'assets', 'fundo'), { recursive: true })
      writeFileSync(join(pasta, 'assets', 'fundo', 'chunk.js'), `console.log("${token}")`)
      expect(varrer(pasta, tokens).map((a) => a.token)).toContain(token)
    }
  })

  it('pasta limpa não acusa nada', () => {
    const pasta = novaPasta()
    writeFileSync(join(pasta, 'app.js'), 'export const ola = "mundo"')
    expect(varrer(pasta, tokens)).toEqual([])
  })

  it('a lista cobre as três exigências da ressalva: dispatchOperation, chaves_idempotencia e DATABASE_URL', () => {
    expect(tokens).toEqual(expect.arrayContaining(['dispatchOperation', 'chaves_idempotencia', 'DATABASE_URL']))
  })
})
