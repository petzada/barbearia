import { describe, expect, it } from 'vitest'
import { arquivosFonte, lerArquivo, semComentarios } from './helpers/varredura'

// D0078: o modo recuperação só muda por operador (CLI `pnpm ops:recovery`), nunca por rota ou operação de usuário.
const DONOS_DA_MUTACAO = new Set([
  'src/platform/recovery/state.ts',
  'src/platform/recovery/index.ts',
])

describe('modo recuperação só é alterado pelo CLI do operador', () => {
  it('nenhum arquivo de src (rotas, módulos, plataforma) chama setRecoveryMode', () => {
    const achados = arquivosFonte('src')
      .filter((arquivo) => !DONOS_DA_MUTACAO.has(arquivo))
      .filter((arquivo) => /\bsetRecoveryMode\b/.test(semComentarios(lerArquivo(arquivo))))
    expect(achados).toEqual([])
  })

  it('a única chamada fora de src é o script de operador', () => {
    const achados = arquivosFonte('scripts').filter((arquivo) =>
      /\bsetRecoveryMode\b/.test(semComentarios(lerArquivo(arquivo))),
    )
    expect(achados).toEqual(['scripts/ops-recovery.ts'])
  })

  it('rotas e módulos de negócio não escrevem na tabela estado_recuperacao', () => {
    const achados = [...arquivosFonte('src/routes'), ...arquivosFonte('src/modules')].filter(
      (arquivo) => /\bestadoRecuperacao\b/.test(semComentarios(lerArquivo(arquivo))),
    )
    expect(achados).toEqual([])
  })
})
