import { describe, expect, it } from 'vitest'
import { PUBLIC_OPERATIONS } from '~/platform/authz'
import { defaultRegistry } from '~/platform/context'
import { loadOperationModules } from '~/platform/context/load-operations.server'
import {
  ARQUIVO_DO_DISPATCHER,
  acharServerFunctionsForaDoConstrutor,
  arquivosFonte,
  lerArquivo,
  semComentarios,
} from './helpers/varredura'

// PRD §7.3: "Lint/teste falha se existir server function fora do construtor."
describe('varredura de createServerFn', () => {
  it('o código real do repositório só chama createServerFn no dispatcher', () => {
    const arquivos = new Map(arquivosFonte('src').map((arquivo) => [arquivo, lerArquivo(arquivo)]))
    expect(acharServerFunctionsForaDoConstrutor(arquivos)).toEqual([])
    expect(arquivos.has(ARQUIVO_DO_DISPATCHER)).toBe(true)
  })

  it('falha quando uma server function nasce fora dos construtores (sem política, sem schema)', () => {
    const arquivos = new Map([
      [
        'src/modules/scheduling/server.ts',
        `import { createServerFn } from '@tanstack/react-start'
         export const reservar = createServerFn({ method: 'POST' }).handler(async () => ({ ok: true }))`,
      ],
      ['src/routes/api/x.ts', `const f = createServerFn()`],
    ])
    const violacoes = acharServerFunctionsForaDoConstrutor(arquivos)
    expect(violacoes.map((v) => v.arquivo)).toEqual([
      'src/modules/scheduling/server.ts',
      'src/routes/api/x.ts',
    ])
    expect(violacoes[0]?.motivo).toMatch(/defineQuery\/defineCommand/)
  })

  it('menções em comentários e documentação não contam', () => {
    const arquivos = new Map([
      [
        'src/modules/a/server.ts',
        '// nunca use createServerFn aqui\n/* createServerFn */\nexport const x = 1',
      ],
    ])
    expect(acharServerFunctionsForaDoConstrutor(arquivos)).toEqual([])
  })

  it('o dispatcher tem exatamente um createServerFn', () => {
    const duplo = new Map([[ARQUIVO_DO_DISPATCHER, 'createServerFn({}); createServerFn({})']])
    expect(acharServerFunctionsForaDoConstrutor(duplo)).toHaveLength(1)
    const nenhum = new Map([[ARQUIVO_DO_DISPATCHER, 'createServerFn({})']])
    expect(acharServerFunctionsForaDoConstrutor(nenhum)).toEqual([])
  })

  it('semComentarios preserva URLs com //', () => {
    expect(semComentarios("const u = 'http://x.test' // comentário")).toContain('http://x.test')
  })
})

describe('allowlist de operações públicas', () => {
  it('toda entrada tem formato válido, sem duplicata', () => {
    expect(new Set(PUBLIC_OPERATIONS).size).toBe(PUBLIC_OPERATIONS.length)
    for (const nome of PUBLIC_OPERATIONS)
      expect(nome).toMatch(/^[a-z][a-z0-9_]*\.[a-z][A-Za-z0-9_]*$/)
  })

  it('toda entrada da allowlist tem operação pública registrada, e toda operação pública está na allowlist', async () => {
    await loadOperationModules()
    const publicas = defaultRegistry
      .list()
      .filter((operacao) => operacao.policy.kind === 'public')
      .map((operacao) => operacao.name)
      .sort()
    expect(publicas).toEqual([...PUBLIC_OPERATIONS].sort())
  })

  it('todas as operações registradas declaram política', async () => {
    await loadOperationModules()
    for (const operacao of defaultRegistry.list()) {
      expect(['public', 'authenticated', 'roles']).toContain(operacao.policy.kind)
    }
  })
})
