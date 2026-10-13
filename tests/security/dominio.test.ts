import { describe, expect, it } from 'vitest'
import { arquivosFonte, lerArquivo, semComentarios } from './helpers/varredura'

// PRD §7.3: "Nenhum Date cru no domínio: sempre via Clock e utilitários de tempo" e "proibição de float
// em domínio". As regras valem para todo `src/modules` (domínio, aplicação, infra) — a plataforma é a
// única dona do relógio do sistema e da conversão de fuso.
const MODULOS = arquivosFonte('src/modules').filter((arquivo) => !arquivo.endsWith('.test.ts'))

const PROIBIDOS: ReadonlyArray<{ nome: string; padrao: RegExp; use: string }> = [
  { nome: 'Date.now()', padrao: /\bDate\.now\s*\(/, use: 'ctx.clock.now()' },
  { nome: 'new Date() sem argumento', padrao: /\bnew Date\s*\(\s*\)/, use: 'ctx.clock.now()' },
  { nome: 'parseFloat', padrao: /\bparseFloat\s*\(/, use: 'parseBRL / centavos inteiros' },
  { nome: '.toFixed(', padrao: /\.toFixed\s*\(/, use: 'formatBRL' },
  {
    nome: 'Intl.DateTimeFormat',
    padrao: /\bIntl\.DateTimeFormat\b/,
    use: 'localDate/zonedInstant de ~/platform/time',
  },
]

describe('relógio, fuso e dinheiro só pela plataforma', () => {
  for (const proibido of PROIBIDOS) {
    it(`src/modules não usa ${proibido.nome}`, () => {
      const achados = MODULOS.filter((arquivo) =>
        proibido.padrao.test(semComentarios(lerArquivo(arquivo))),
      )
      expect(achados, `use ${proibido.use}`).toEqual([])
    })
  }

  it('o detector enxerga os padrões proibidos (autoteste)', () => {
    const exemplo = 'const a = Date.now(); const b = new Date(); const c = (1.5).toFixed(2)'
    expect(PROIBIDOS.filter((p) => p.padrao.test(exemplo)).map((p) => p.nome)).toEqual([
      'Date.now()',
      'new Date() sem argumento',
      '.toFixed(',
    ])
  })
})
