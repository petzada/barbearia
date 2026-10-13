import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

export const RAIZ = resolve(__dirname, '..', '..', '..')

/** Lista arquivos `.ts`/`.tsx` sob `pasta`, ignorando gerados. Caminhos relativos à raiz, com `/`. */
export function arquivosFonte(pasta: string): string[] {
  const saida: string[] = []
  const visitar = (dir: string): void => {
    for (const nome of readdirSync(dir)) {
      const caminho = join(dir, nome)
      if (statSync(caminho).isDirectory()) {
        if (nome !== 'node_modules') visitar(caminho)
      } else if (/\.(ts|tsx)$/.test(nome) && nome !== 'routeTree.gen.ts') {
        saida.push(relative(RAIZ, caminho).split(sep).join('/'))
      }
    }
  }
  visitar(resolve(RAIZ, pasta))
  return saida
}

export function lerArquivo(caminhoRelativo: string): string {
  return readFileSync(resolve(RAIZ, caminhoRelativo), 'utf8')
}

/** Remove comentários para que menções em documentação não contem como uso. */
export function semComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/** O único arquivo autorizado a chamar `createServerFn` (ver dispatcher.ts). */
export const ARQUIVO_DO_DISPATCHER = 'src/platform/context/dispatcher.ts'

export interface Violacao {
  readonly arquivo: string
  readonly motivo: string
}

/**
 * Varredura de server functions (PRD §7.3, D0015): toda função exposta ao navegador precisa nascer de
 * `defineQuery`/`defineCommand`; portanto `createServerFn` só pode existir no dispatcher.
 * Recebe um mapa arquivo → conteúdo para poder ser testada com fixtures.
 */
export function acharServerFunctionsForaDoConstrutor(
  arquivos: ReadonlyMap<string, string>,
): Violacao[] {
  const violacoes: Violacao[] = []
  for (const [arquivo, conteudo] of arquivos) {
    const codigo = semComentarios(conteudo)
    if (/\bcreateServerFn\b/.test(codigo) && arquivo !== ARQUIVO_DO_DISPATCHER) {
      violacoes.push({
        arquivo,
        motivo:
          'createServerFn fora do dispatcher: use defineQuery/defineCommand (política + schema obrigatórios)',
      })
    }
    if (/\bcreateServerFn\b/.test(codigo) && arquivo === ARQUIVO_DO_DISPATCHER) {
      const chamadas = codigo.match(/\bcreateServerFn\s*\(/g)?.length ?? 0
      if (chamadas !== 1) {
        violacoes.push({
          arquivo,
          motivo: `o dispatcher deve ter exatamente 1 createServerFn (tem ${chamadas})`,
        })
      }
    }
  }
  return violacoes
}
