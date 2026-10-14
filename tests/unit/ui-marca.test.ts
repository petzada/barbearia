import { describe, expect, it } from 'vitest'
import {
  BrandConfigError,
  brandToCss,
  brandToCssVars,
  defaultBrand,
  type BrandConfig,
} from '~/ui/brand/brand-config'

describe('tokens vindos da configuração da marca (T05, T08)', () => {
  it('gera as variáveis CSS com os mesmos nomes do @theme', () => {
    const vars = brandToCssVars(defaultBrand)
    expect(vars['--color-primaria']).toBe(defaultBrand.cores.primaria)
    expect(vars['--color-fundo']).toBe(defaultBrand.cores.fundo)
    expect(vars['--radius-md']).toBe(defaultBrand.raio.md)
    expect(vars['--font-sans']).toBe(defaultBrand.tipografia.fontePrincipal)
  })

  it('a marca configurada troca as cores sem mexer em componentes', () => {
    const outra: BrandConfig = {
      ...defaultBrand,
      cores: { ...defaultBrand.cores, primaria: '#c0392b', sobrePrimaria: '#ffffff' },
    }
    const css = brandToCss(outra)
    expect(css).toContain('--color-primaria:#c0392b;')
    expect(css.startsWith(':root{')).toBe(true)
    expect(css.endsWith('}')).toBe(true)
  })

  it('o CSS de tokens do styles.css declara todas as variáveis que a marca sobrescreve', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const css = readFileSync(resolve(import.meta.dirname, '..', '..', 'src', 'styles.css'), 'utf8')
    for (const nome of Object.keys(brandToCssVars(defaultBrand))) {
      expect(css, nome).toContain(`${nome}:`)
    }
  })

  it.each([
    ['fecha a regra e injeta CSS', '#fff;}body{display:none'],
    ['usa url()', 'url(https://evil.example/x.png)'],
    ['abre comentário', '#fff /* x */'],
    ['injeta tag', '</style><script>alert(1)</script>'],
    ['usa barra invertida', '\\72 ed'],
    ['usa ponto e vírgula', 'red;background:blue'],
  ])('recusa valor de marca que %s', (_caso, valor) => {
    const suja: BrandConfig = { ...defaultBrand, cores: { ...defaultBrand.cores, primaria: valor } }
    expect(() => brandToCss(suja)).toThrow(BrandConfigError)
  })

  it('as boas-vindas padrão têm de 2 a 3 telas e versão', () => {
    expect(defaultBrand.boasVindas.telas.length).toBeGreaterThanOrEqual(2)
    expect(defaultBrand.boasVindas.telas.length).toBeLessThanOrEqual(3)
    expect(defaultBrand.boasVindas.versao).not.toBe('')
  })
})
