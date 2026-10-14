import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { logger } from '../logging'

const PASTA_PADRAO = fileURLToPath(new URL('../../modules/', import.meta.url))
const ARQUIVOS = ['jobs.ts', 'jobs.js']

/**
 * Registro por import: cada `modules/<m>/jobs.ts` declara suas filas (`defineQueue`), handlers de job
 * (`registerJobHandler`) e handlers de evento (`registerEventHandler`). Fora do Vite não existe
 * `import.meta.glob`, então o worker varre a pasta e importa dinamicamente. Devolve os módulos carregados.
 */
export async function loadModuleJobs(pasta: string = PASTA_PADRAO): Promise<string[]> {
  if (!existsSync(pasta)) return []
  const carregados: string[] = []
  for (const nome of readdirSync(pasta).sort()) {
    const dir = join(pasta, nome)
    if (!statSync(dir).isDirectory()) continue
    const arquivo = ARQUIVOS.map((a) => join(dir, a)).find((caminho) => existsSync(caminho))
    if (!arquivo) continue
    await import(pathToFileURL(arquivo).href)
    carregados.push(nome)
  }
  logger.info({ modulos: carregados }, 'módulos com jobs carregados')
  return carregados
}
