import { loadEnv } from '../src/platform/validation/env'
import { carregarEnvLocal } from './lib/env'

// Valida o ambiente como o boot faz (PRD §7.8). Só imprime NOMES de variáveis, nunca valores.
carregarEnvLocal()
try {
  const env = loadEnv()
  const definidas = Object.entries(env)
    .filter(([, valor]) => valor !== undefined)
    .map(([nome]) => nome)
    .sort()
  console.log(`ambiente válido (${definidas.length} variáveis definidas): ${definidas.join(', ')}`)
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : String(erro))
  process.exit(1)
}
